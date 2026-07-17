import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { notificationService } from "./notification.service";

const commentInclude = {
  author: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
  likes: { select: { emoji: true, userId: true } },
  _count: { select: { replies: { where: { deletedAt: null } } } },
} satisfies Prisma.CommentInclude;

type CommentWithIncludes = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

function toCommentDTO(comment: CommentWithIncludes, viewerId: string | undefined) {
  const reactionCounts = new Map<string, number>();
  let viewerReaction: string | null = null;

  for (const like of comment.likes) {
    reactionCounts.set(like.emoji, (reactionCounts.get(like.emoji) ?? 0) + 1);
    if (viewerId && like.userId === viewerId) viewerReaction = like.emoji;
  }

  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    author: comment.author,
    content: comment.content,
    isEdited: comment.isEdited,
    createdAt: comment.createdAt.toISOString(),
    repliesCount: comment._count.replies,
    reactions: Array.from(reactionCounts.entries()).map(([emoji, count]) => ({ emoji, count })),
    totalReactionsCount: comment.likes.length,
    viewerReaction,
    isOwnComment: viewerId === comment.author.id,
  };
}

export const commentService = {
  async createComment(postId: string, authorId: string, content: string, parentId: string | undefined) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    let parent = null;
    if (parentId) {
      parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.deletedAt || parent.postId !== postId) throw AppError.notFound("Comment not found");
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId, content, parentId },
      include: commentInclude,
    });

    // Notify the post author for a top-level comment, or the parent comment's
    // author for a reply — never notify yourself for commenting on your own content.
    const notifyRecipientId = parent ? parent.authorId : post.authorId;
    await notificationService.create({
      type: "COMMENT",
      recipientId: notifyRecipientId,
      actorId: authorId,
      postId,
      commentId: comment.id,
    });

    return toCommentDTO(comment, authorId);
  },

  async getCommentsForPost(postId: string, viewerId: string | undefined, cursor: string | undefined, limit: number) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, deletedAt: null },
      include: commentInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(comments, limit);
    return { items: items.map((c) => toCommentDTO(c, viewerId)), nextCursor };
  },

  async getReplies(commentId: string, viewerId: string | undefined, cursor: string | undefined, limit: number) {
    const parent = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!parent || parent.deletedAt) throw AppError.notFound("Comment not found");

    const replies = await prisma.comment.findMany({
      where: { parentId: commentId, deletedAt: null },
      include: commentInclude,
      orderBy: { createdAt: "asc" }, // replies read chronologically, oldest first, unlike top-level comments
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(replies, limit);
    return { items: items.map((c) => toCommentDTO(c, viewerId)), nextCursor };
  },

  async updateComment(commentId: string, authorId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw AppError.notFound("Comment not found");
    if (comment.authorId !== authorId) throw AppError.forbidden("You can only edit your own comments");

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content, isEdited: true },
      include: commentInclude,
    });

    return toCommentDTO(updated, authorId);
  },

  async deleteComment(commentId: string, authorId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw AppError.notFound("Comment not found");
    if (comment.authorId !== authorId) throw AppError.forbidden("You can only delete your own comments");

    // Soft delete, matching Post — preserves reply threads (a deleted comment's
    // replies stay intact; the frontend can render "[deleted]" in its place).
    await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  },

  /** Upserts the viewer's reaction — reacting again with a different emoji replaces the previous one (one reaction per user per comment, matching Slack/Facebook-style comment reactions rather than Post's multi-emoji model). */
  async reactToComment(commentId: string, userId: string, emoji: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw AppError.notFound("Comment not found");

    await prisma.commentLike.upsert({
      where: { commentId_userId: { commentId, userId } },
      update: { emoji },
      create: { commentId, userId, emoji },
    });

    await notificationService.create({
      type: "LIKE",
      recipientId: comment.authorId,
      actorId: userId,
      postId: comment.postId,
      commentId,
    });
  },

  async removeReaction(commentId: string, userId: string) {
    await prisma.commentLike.deleteMany({ where: { commentId, userId } });
  },
};
