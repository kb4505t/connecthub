import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    post: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    commentLike: { upsert: vi.fn(), deleteMany: vi.fn() },
    notification: { create: vi.fn(() => Promise.resolve({})) },
  },
}));

import { prisma } from "../config/db";
import { commentService } from "../services/comment.service";
import { AppError } from "../utils/AppError";

const fullCommentMock = {
  id: "comment-1",
  postId: "post-1",
  parentId: null,
  content: "hello",
  isEdited: false,
  createdAt: new Date(),
  authorId: "author-1",
  author: { id: "author-1", username: "author", fullName: null, avatarUrl: null, isVerified: false },
  likes: [],
  _count: { replies: 0 },
};

describe("commentService.createComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects commenting on a post that doesn't exist", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(commentService.createComment("post-1", "user-1", "hi", undefined)).rejects.toThrow(AppError);
  });

  it("rejects replying to a comment on a different post", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "author-1", deletedAt: null });
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "parent-1",
      postId: "different-post",
      deletedAt: null,
      authorId: "someone",
    });

    await expect(commentService.createComment("post-1", "user-1", "hi", "parent-1")).rejects.toThrow(AppError);
  });

  it("notifies the post author for a top-level comment, but not for a self-comment", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "author-1", deletedAt: null });
    (prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue(fullCommentMock);

    await commentService.createComment("post-1", "user-2", "hi", undefined);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipientId: "author-1", actorId: "user-2" }) })
    );

    vi.clearAllMocks();
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", authorId: "author-1", deletedAt: null });
    (prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue(fullCommentMock);

    await commentService.createComment("post-1", "author-1", "hi", undefined);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe("commentService.updateComment / deleteComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects editing someone else's comment", async () => {
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "comment-1", deletedAt: null, authorId: "someone-else" });
    await expect(commentService.updateComment("comment-1", "user-1", "edited")).rejects.toThrow(AppError);
  });

  it("rejects deleting someone else's comment", async () => {
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "comment-1", deletedAt: null, authorId: "someone-else" });
    await expect(commentService.deleteComment("comment-1", "user-1")).rejects.toThrow(AppError);
  });

  it("rejects operating on an already-deleted comment", async () => {
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "comment-1", deletedAt: new Date(), authorId: "user-1" });
    await expect(commentService.deleteComment("comment-1", "user-1")).rejects.toThrow(AppError);
  });
});

describe("commentService.reactToComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts the reaction (replacing any previous emoji) rather than stacking multiple rows", async () => {
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "comment-1", deletedAt: null, authorId: "author-1", postId: "post-1" });

    await commentService.reactToComment("comment-1", "user-2", "🔥");

    expect(prisma.commentLike.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { commentId_userId: { commentId: "comment-1", userId: "user-2" } },
        update: { emoji: "🔥" },
        create: { commentId: "comment-1", userId: "user-2", emoji: "🔥" },
      })
    );
  });

  it("does not notify yourself for reacting to your own comment", async () => {
    (prisma.comment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "comment-1", deletedAt: null, authorId: "user-1", postId: "post-1" });

    await commentService.reactToComment("comment-1", "user-1", "❤️");
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
