import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { durationToDate } from "../utils/date";
import { storageService } from "./storage.service";
import { isVideoMimeType } from "../middlewares/upload";

const authorSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

/** `viewerId` is whoever is requesting — used to compute `hasViewed` per story without a second round trip. */
function storyInclude(viewerId: string) {
  return {
    author: { select: authorSelect },
    views: { where: { viewerId }, select: { id: true } },
    _count: { select: { views: true } },
  } satisfies Prisma.StoryInclude;
}

type StoryWithIncludes = Prisma.StoryGetPayload<{ include: ReturnType<typeof storyInclude> }>;

function toStoryDTO(story: StoryWithIncludes) {
  return {
    id: story.id,
    author: story.author,
    mediaUrl: story.mediaUrl,
    mediaType: story.mediaType,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
    viewCount: story._count.views,
    hasViewed: story.views.length > 0,
  };
}

export const storyService = {
  async createStory(userId: string, file: { buffer: Buffer; mimetype: string }) {
    const isVideo = isVideoMimeType(file.mimetype);
    const mediaUrl = isVideo
      ? await storageService.uploadStoryVideo(userId, file.buffer, file.mimetype)
      : await storageService.uploadStoryImage(userId, file.buffer);

    const story = await prisma.story.create({
      data: {
        authorId: userId,
        mediaUrl,
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        expiresAt: durationToDate("24h"),
      },
      include: storyInclude(userId),
    });

    return toStoryDTO(story);
  },

  /**
   * Grouped story tray for the feed: the viewer's own active stories (if
   * any) first, then everyone they follow who currently has an active
   * story — unseen authors before fully-seen ones, each group's stories in
   * chronological order (oldest first, matching how a viewer taps through
   * them). Not cursor-paginated like the rest of the app's lists: a story
   * tray is bounded by "people you follow with something active in the last
   * 24h", which stays small enough at this project's scale to load in one
   * shot — a real high-follow-count product might revisit this.
   */
  async getStoryFeed(userId: string) {
    const follows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
    const authorIds = [userId, ...follows.map((f) => f.followingId)];

    const stories = await prisma.story.findMany({
      where: { authorId: { in: authorIds }, expiresAt: { gt: new Date() } },
      include: storyInclude(userId),
      orderBy: { createdAt: "asc" },
    });

    const groupsByAuthor = new Map<string, StoryWithIncludes[]>();
    for (const story of stories) {
      const list = groupsByAuthor.get(story.authorId) ?? [];
      list.push(story);
      groupsByAuthor.set(story.authorId, list);
    }

    const groups = Array.from(groupsByAuthor.values()).map((group) => {
      const isOwn = group[0].authorId === userId;
      const hasUnseen = !isOwn && group.some((s) => s.views.length === 0);
      return {
        author: group[0].author,
        stories: group.map(toStoryDTO),
        hasUnseen,
        isOwn,
        latestCreatedAt: group[group.length - 1].createdAt.getTime(),
      };
    });

    groups.sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return b.latestCreatedAt - a.latestCreatedAt;
    });

    return groups.map(({ author, stories: groupStories, hasUnseen }) => ({ author, stories: groupStories, hasUnseen }));
  },

  async recordView(storyId: string, viewerId: string) {
    const story = await prisma.story.findFirst({ where: { id: storyId, expiresAt: { gt: new Date() } } });
    if (!story) throw AppError.notFound("Story not found or has expired");

    if (story.authorId === viewerId) return; // authors don't "view" their own story — no self-view row

    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      create: { storyId, viewerId },
      update: {}, // already viewed — idempotent, don't bump viewedAt on a re-open
    });
  },

  async getStoryViewers(storyId: string, requesterId: string, cursor: string | undefined, limit: number) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw AppError.notFound("Story not found");
    if (story.authorId !== requesterId) throw AppError.forbidden("Only the author can see who viewed this story");

    const rows = await prisma.storyView.findMany({
      where: { storyId },
      include: { viewer: { select: authorSelect } },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return {
      items: items.map((v) => ({ viewer: v.viewer, viewedAt: v.viewedAt.toISOString() })),
      nextCursor,
    };
  },

  async deleteStory(storyId: string, userId: string) {
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw AppError.notFound("Story not found");
    if (story.authorId !== userId) throw AppError.forbidden("You can only delete your own story");

    await prisma.story.delete({ where: { id: storyId } });
    await storageService.deleteByPublicUrl("story-media", story.mediaUrl);
  },
};
