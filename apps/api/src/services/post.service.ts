import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { storageService } from "./storage.service";
import { isVideoMimeType } from "../middlewares/upload";
import { extractHashtags, extractMentionedUsernames } from "../utils/textParsing";
import { paginate } from "../utils/pagination";
import { durationToDate } from "../utils/date";
import { notificationService } from "./notification.service";
import type { CreatePostInput, UpdatePostInput } from "@connecthub/shared-types";

// Full Prisma include shape shared by every query that returns post(s) to the client.
const postInclude = {
  author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
  media: { orderBy: { order: "asc" as const } },
  poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
  likes: { select: { emoji: true, userId: true } },
  originalPost: {
    include: {
      author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
      media: { orderBy: { order: "asc" as const } },
      poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
      likes: { select: { emoji: true, userId: true } },
      _count: { select: { comments: { where: { deletedAt: null } }, reposts: true, bookmarks: true } },
    },
  },
  _count: { select: { comments: { where: { deletedAt: null } }, reposts: true, bookmarks: true } },
} satisfies Prisma.PostInclude;

type PostWithIncludes = Prisma.PostGetPayload<{ include: typeof postInclude }>;

interface ViewerContext {
  bookmarkedPostIds: Set<string>;
  repostedOriginalIds: Set<string>; // set of originalPostIds the viewer has reposted
  viewerVotesByPollId: Map<string, string>; // pollId -> optionId
}

const EMPTY_VIEWER_CONTEXT: ViewerContext = {
  bookmarkedPostIds: new Set(),
  repostedOriginalIds: new Set(),
  viewerVotesByPollId: new Map(),
};

/** Bulk-fetches everything needed to compute per-viewer flags (isBookmarked, isReposted...) for a batch of posts in a few queries instead of N+1. Reactions aren't included here — post.likes is already loaded per-post via postInclude, same pattern as commentInclude. */
async function buildViewerContext(viewerId: string | undefined, postIds: string[], pollIds: string[]): Promise<ViewerContext> {
  if (!viewerId || postIds.length === 0) return EMPTY_VIEWER_CONTEXT;

  const [bookmarks, reposts, votes] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    prisma.post.findMany({
      where: { authorId: viewerId, originalPostId: { in: postIds }, deletedAt: null },
      select: { originalPostId: true },
    }),
    pollIds.length
      ? prisma.pollVote.findMany({ where: { userId: viewerId, option: { pollId: { in: pollIds } } }, select: { optionId: true, option: { select: { pollId: true } } } })
      : Promise.resolve([]),
  ]);

  return {
    bookmarkedPostIds: new Set(bookmarks.map((b) => b.postId)),
    repostedOriginalIds: new Set(reposts.map((r) => r.originalPostId).filter((id): id is string => !!id)),
    viewerVotesByPollId: new Map(votes.map((v) => [v.option.pollId, v.optionId])),
  };
}

function toPostDTO(post: PostWithIncludes, viewerId: string | undefined, ctx: ViewerContext): Record<string, unknown> {
  const poll = post.poll
    ? {
        id: post.poll.id,
        expiresAt: post.poll.expiresAt.toISOString(),
        options: post.poll.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
        totalVotes: post.poll.options.reduce((sum, o) => sum + o._count.votes, 0),
        viewerVoteOptionId: ctx.viewerVotesByPollId.get(post.poll.id) ?? null,
      }
    : null;

  const reactionCounts = new Map<string, number>();
  let viewerReaction: string | null = null;
  for (const like of post.likes) {
    reactionCounts.set(like.emoji, (reactionCounts.get(like.emoji) ?? 0) + 1);
    if (viewerId && like.userId === viewerId) viewerReaction = like.emoji;
  }

  return {
    id: post.id,
    author: post.author,
    content: post.content,
    visibility: post.visibility,
    isPinned: post.isPinned,
    isEdited: post.isEdited,
    createdAt: post.createdAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    media: post.media.map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      width: m.width,
      height: m.height,
      duration: m.duration,
      order: m.order,
    })),
    poll,
    originalPost: post.originalPost
      ? toPostDTO(
          // originalPost's own `originalPost` is always null (no double-nested reposts) — cast is safe since we never repost a repost's original chain further than one level
          { ...post.originalPost, originalPost: null, poll: post.originalPost.poll } as unknown as PostWithIncludes,
          viewerId,
          ctx
        )
      : null,
    reactions: Array.from(reactionCounts.entries()).map(([emoji, count]) => ({ emoji, count })),
    likesCount: post.likes.length,
    commentsCount: post._count.comments,
    repostsCount: post._count.reposts,
    bookmarksCount: post._count.bookmarks,
    viewerReaction,
    isLiked: viewerReaction !== null,
    isBookmarked: ctx.bookmarkedPostIds.has(post.id),
    isReposted: ctx.repostedOriginalIds.has(post.id),
    isOwnPost: viewerId === post.author.id,
  };
}

/** Bulk-converts a list of posts to DTOs, building the viewer context once for the whole batch. */
async function toPostDTOs(posts: PostWithIncludes[], viewerId: string | undefined) {
  const allPostIds = posts.flatMap((p) => [p.id, ...(p.originalPost ? [p.originalPost.id] : [])]);
  const allPollIds = posts.flatMap((p) => [
    ...(p.poll ? [p.poll.id] : []),
    ...(p.originalPost?.poll ? [p.originalPost.poll.id] : []),
  ]);
  const ctx = await buildViewerContext(viewerId, allPostIds, allPollIds);
  return posts.map((p) => toPostDTO(p, viewerId, ctx));
}

/**
 * Builds the Prisma where-clause enforcing who can see a post: published
 * (not scheduled-future, not deleted), and respecting both the post's own
 * visibility setting and the author's account-level privacy flag from
 * Phase 4 (a private account's PUBLIC posts are still follower-only).
 */
async function buildVisibilityWhere(viewerId: string | undefined): Promise<Prisma.PostWhereInput> {
  const now = new Date();
  const base: Prisma.PostWhereInput = { deletedAt: null, publishedAt: { not: null, lte: now } };

  if (!viewerId) {
    return { ...base, visibility: "PUBLIC", author: { isPrivate: false } };
  }

  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const followingIds = following.map((f) => f.followingId);

  return {
    ...base,
    OR: [
      { authorId: viewerId }, // always see your own posts
      { visibility: "PUBLIC", author: { isPrivate: false } },
      { visibility: "PUBLIC", authorId: { in: followingIds } }, // covers private authors you follow
      { visibility: "FOLLOWERS", authorId: { in: followingIds } },
    ],
  };
}

export const postService = {
  async createPost(authorId: string, input: CreatePostInput, files: Express.Multer.File[]) {
    if (files.length > 0 && input.pollOptions) {
      throw AppError.badRequest("A post can't have both media and a poll");
    }
    if (!input.content?.trim() && files.length === 0 && !input.pollOptions) {
      throw AppError.badRequest("A post needs text, media, or a poll");
    }

    const isScheduled = !!input.scheduledFor && input.scheduledFor.getTime() > Date.now();

    // Upload media (if any) before creating the row, so we don't leave a post with no media on upload failure
    const mediaData = [];
    for (const [index, file] of files.entries()) {
      if (isVideoMimeType(file.mimetype)) {
        const url = await storageService.uploadPostVideo(authorId, file.buffer, file.mimetype);
        mediaData.push({ type: "VIDEO" as const, url, order: index });
      } else {
        const { url, width, height } = await storageService.uploadPostImage(authorId, file.buffer);
        mediaData.push({ type: "IMAGE" as const, url, width, height, order: index });
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        content: input.content?.trim() || null,
        visibility: input.visibility,
        scheduledFor: isScheduled ? input.scheduledFor : null,
        publishedAt: isScheduled ? null : new Date(),
        media: mediaData.length ? { create: mediaData } : undefined,
        poll: input.pollOptions
          ? {
              create: {
                expiresAt: durationToDate(`${input.pollDurationHours ?? 24}h`),
                options: { create: input.pollOptions.map((text) => ({ text })) },
              },
            }
          : undefined,
      },
      include: postInclude,
    });

    if (input.content) await postService.syncHashtagsAndMentions(post.id, authorId, input.content);

    const [dto] = await toPostDTOs([post], authorId);
    return dto;
  },

  /** Extracts #hashtags/@mentions from content and creates the join rows + mention notifications. */
  async syncHashtagsAndMentions(postId: string, authorId: string, content: string) {
    const hashtags = extractHashtags(content);
    for (const tag of hashtags) {
      const hashtag = await prisma.hashtag.upsert({ where: { tag }, update: {}, create: { tag } });
      await prisma.postHashtag.upsert({
        where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
        update: {},
        create: { postId, hashtagId: hashtag.id },
      });
    }

    const usernames = extractMentionedUsernames(content);
    if (usernames.length === 0) return;

    const mentionedUsers = await prisma.user.findMany({ where: { username: { in: usernames } }, select: { id: true } });
    for (const user of mentionedUsers) {
      if (user.id === authorId) continue; // don't notify yourself for self-mentions
      await prisma.postMention.create({ data: { postId, mentionedUserId: user.id } }).catch(() => null);
      await notificationService.create({ type: "MENTION", recipientId: user.id, actorId: authorId, postId });
    }
  },

  async getPostById(postId: string, viewerId: string | undefined) {
    const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    const visibilityWhere = await buildVisibilityWhere(viewerId);
    const visible = await prisma.post.findFirst({ where: { id: postId, ...visibilityWhere }, select: { id: true } });
    if (!visible) throw AppError.notFound("Post not found");

    const [dto] = await toPostDTOs([post], viewerId);
    return dto;
  },

  async getFeed(viewerId: string | undefined, type: "following" | "latest" | "trending", cursor: string | undefined, limit: number) {
    const visibilityWhere = await buildVisibilityWhere(viewerId);

    if (type === "following") {
      if (!viewerId) throw AppError.unauthorized("Log in to see your following feed");
      const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
      const authorIds = [...following.map((f) => f.followingId), viewerId];

      const posts = await prisma.post.findMany({
        where: { ...visibilityWhere, authorId: { in: authorIds } },
        include: postInclude,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      const { items, nextCursor } = paginate(posts, limit);
      return { items: await toPostDTOs(items, viewerId), nextCursor };
    }

    if (type === "trending") {
      // Simplified ranking (see Phase 5 notes): recent posts ordered by engagement,
      // not a personalized recommendation. Offset-based pagination here (cursor
      // doubles as a numeric offset) since the candidate pool is small and
      // time-bounded — a real trending pipeline would precompute scores instead.
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const offset = cursor ? parseInt(cursor, 10) || 0 : 0;

      const posts = await prisma.post.findMany({
        where: { ...visibilityWhere, createdAt: { gte: since } },
        include: postInclude,
        orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
        take: limit + 1,
        skip: offset,
      });
      const { items, nextCursor: hasMore } = paginate(posts, limit);
      return { items: await toPostDTOs(items, viewerId), nextCursor: hasMore ? String(offset + limit) : null };
    }

    // "latest": global chronological feed
    const posts = await prisma.post.findMany({
      where: visibilityWhere,
      include: postInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const { items, nextCursor } = paginate(posts, limit);
    return { items: await toPostDTOs(items, viewerId), nextCursor };
  },

  async getPostsByUsername(username: string, viewerId: string | undefined, cursor: string | undefined, limit: number) {
    const author = await prisma.user.findUnique({ where: { username } });
    if (!author) throw AppError.notFound("User not found");

    const visibilityWhere = await buildVisibilityWhere(viewerId);
    const posts = await prisma.post.findMany({
      where: { ...visibilityWhere, authorId: author.id },
      include: postInclude,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const { items, nextCursor } = paginate(posts, limit);
    return { items: await toPostDTOs(items, viewerId), nextCursor };
  },

  /** Substring match on post content, same visibility rules as every other post query — a private account's posts don't leak through search just because they matched the text. */
  async searchPosts(viewerId: string | undefined, query: string, cursor: string | undefined, limit: number) {
    const visibilityWhere = await buildVisibilityWhere(viewerId);
    const posts = await prisma.post.findMany({
      where: { ...visibilityWhere, content: { contains: query, mode: "insensitive" } },
      include: postInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const { items, nextCursor } = paginate(posts, limit);
    return { items: await toPostDTOs(items, viewerId), nextCursor };
  },

  /** Posts tagged with a given hashtag — the landing page a hashtag search result links into. Tag is matched case-insensitively and normalized without a leading "#", same convention `syncHashtagsAndMentions` stores it in. */
  async getPostsByHashtag(tag: string, viewerId: string | undefined, cursor: string | undefined, limit: number) {
    const normalizedTag = tag.toLowerCase().replace(/^#/, "");
    const visibilityWhere = await buildVisibilityWhere(viewerId);
    const posts = await prisma.post.findMany({
      where: { ...visibilityWhere, hashtags: { some: { hashtag: { tag: normalizedTag } } } },
      include: postInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const { items, nextCursor } = paginate(posts, limit);
    return { items: await toPostDTOs(items, viewerId), nextCursor };
  },

  async updatePost(postId: string, authorId: string, input: UpdatePostInput) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");
    if (post.authorId !== authorId) throw AppError.forbidden("You can only edit your own posts");

    const updated = await prisma.post.update({
      where: { id: postId },
      data: { content: input.content ?? post.content, visibility: input.visibility ?? post.visibility, isEdited: true },
      include: postInclude,
    });

    const [dto] = await toPostDTOs([updated], authorId);
    return dto;
  },

  async deletePost(postId: string, authorId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");
    if (post.authorId !== authorId) throw AppError.forbidden("You can only delete your own posts");

    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date(), isPinned: false } });
  },

  async pinPost(postId: string, authorId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");
    if (post.authorId !== authorId) throw AppError.forbidden("You can only pin your own posts");

    // Only one pinned post per profile — unpin any existing one first.
    await prisma.$transaction([
      prisma.post.updateMany({ where: { authorId, isPinned: true }, data: { isPinned: false } }),
      prisma.post.update({ where: { id: postId }, data: { isPinned: true } }),
    ]);
  },

  async unpinPost(postId: string, authorId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");
    if (post.authorId !== authorId) throw AppError.forbidden("You can only unpin your own posts");

    await prisma.post.update({ where: { id: postId }, data: { isPinned: false } });
  },

  async bookmarkPost(postId: string, userId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    await prisma.bookmark.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
  },

  async unbookmarkPost(postId: string, userId: string) {
    await prisma.bookmark.deleteMany({ where: { postId, userId } });
  },

  /** Upserts the viewer's reaction — reacting again with a different emoji replaces the previous one, matching CommentLike's model (one reaction per user, not multiple simultaneous emoji). */
  async likePost(postId: string, userId: string, emoji: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    await prisma.like.upsert({
      where: { postId_userId: { postId, userId } },
      update: { emoji },
      create: { postId, userId, emoji },
    });

    await notificationService.create({ type: "LIKE", recipientId: post.authorId, actorId: userId, postId });
  },

  async unlikePost(postId: string, userId: string) {
    await prisma.like.deleteMany({ where: { postId, userId } });
  },

  async getPostLikers(postId: string, cursor: string | undefined, limit: number) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    const rows = await prisma.like.findMany({
      where: { postId },
      include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } } },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return { items: items.map((r) => ({ ...r.user, emoji: r.emoji })), nextCursor };
  },

  async getBookmarks(userId: string, cursor: string | undefined, limit: number) {
    const rows = await prisma.bookmark.findMany({
      where: { userId, post: { deletedAt: null } },
      include: { post: { include: postInclude } },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const { items, nextCursor } = paginate(rows, limit);
    const posts = items.map((r) => r.post);
    return { items: await toPostDTOs(posts, userId), nextCursor };
  },

  async repostPost(postId: string, authorId: string, content: string | undefined) {
    const original = await prisma.post.findUnique({ where: { id: postId } });
    if (!original || original.deletedAt) throw AppError.notFound("Post not found");
    if (original.originalPostId) throw AppError.badRequest("You can't repost a repost — repost the original instead");

    const existing = await prisma.post.findFirst({ where: { authorId, originalPostId: postId, deletedAt: null } });
    if (existing) throw AppError.conflict("You've already reposted this");

    const repost = await prisma.post.create({
      data: {
        authorId,
        content: content?.trim() || null,
        originalPostId: postId,
        publishedAt: new Date(),
      },
      include: postInclude,
    });

    await notificationService.create({ type: "REPOST", recipientId: original.authorId, actorId: authorId, postId });

    const [dto] = await toPostDTOs([repost], authorId);
    return dto;
  },

  async undoRepost(postId: string, authorId: string) {
    await prisma.post.updateMany({
      where: { authorId, originalPostId: postId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  async voteOnPoll(pollId: string, userId: string, optionId: string) {
    const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
    if (!poll) throw AppError.notFound("Poll not found");
    if (poll.expiresAt < new Date()) throw AppError.badRequest("This poll has closed");
    if (!poll.options.some((o) => o.id === optionId)) throw AppError.badRequest("Invalid poll option");

    const existingVote = await prisma.pollVote.findFirst({ where: { userId, option: { pollId } } });
    if (existingVote) throw AppError.conflict("You've already voted on this poll");

    await prisma.pollVote.create({ data: { optionId, userId } });
  },
};
