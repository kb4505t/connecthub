import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    post: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    follow: { findMany: vi.fn(() => Promise.resolve([])) },
    poll: { findUnique: vi.fn() },
    pollVote: { findFirst: vi.fn(), create: vi.fn() },
    like: { upsert: vi.fn(), deleteMany: vi.fn() },
    notification: { create: vi.fn(() => Promise.resolve({})) },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));

import { prisma } from "../config/db";
import { postService } from "../services/post.service";
import { AppError } from "../utils/AppError";

describe("postService.repostPost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects reposting a post that doesn't exist", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(postService.repostPost("post-1", "user-1", undefined)).rejects.toThrow(AppError);
  });

  it("rejects reposting a repost (must repost the original)", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "post-1",
      deletedAt: null,
      originalPostId: "original-post-0",
    });
    await expect(postService.repostPost("post-1", "user-1", undefined)).rejects.toThrow(AppError);
  });

  it("rejects reposting the same post twice", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "post-1",
      deletedAt: null,
      originalPostId: null,
      authorId: "author-1",
    });
    (prisma.post.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing-repost" });

    await expect(postService.repostPost("post-1", "user-1", undefined)).rejects.toThrow(AppError);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

describe("postService.voteOnPoll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects voting on a poll that doesn't exist", async () => {
    (prisma.poll.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(postService.voteOnPoll("poll-1", "user-1", "option-1")).rejects.toThrow(AppError);
  });

  it("rejects voting on a closed poll", async () => {
    (prisma.poll.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "poll-1",
      expiresAt: new Date(Date.now() - 1000),
      options: [{ id: "option-1" }],
    });
    await expect(postService.voteOnPoll("poll-1", "user-1", "option-1")).rejects.toThrow(AppError);
  });

  it("rejects voting for an option that doesn't belong to the poll", async () => {
    (prisma.poll.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "poll-1",
      expiresAt: new Date(Date.now() + 100000),
      options: [{ id: "option-1" }],
    });
    await expect(postService.voteOnPoll("poll-1", "user-1", "option-999")).rejects.toThrow(AppError);
  });

  it("rejects voting twice on the same poll", async () => {
    (prisma.poll.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "poll-1",
      expiresAt: new Date(Date.now() + 100000),
      options: [{ id: "option-1" }],
    });
    (prisma.pollVote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing-vote" });

    await expect(postService.voteOnPoll("poll-1", "user-1", "option-1")).rejects.toThrow(AppError);
    expect(prisma.pollVote.create).not.toHaveBeenCalled();
  });

  it("records a valid, first-time vote", async () => {
    (prisma.poll.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "poll-1",
      expiresAt: new Date(Date.now() + 100000),
      options: [{ id: "option-1" }],
    });
    (prisma.pollVote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.pollVote.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await postService.voteOnPoll("poll-1", "user-1", "option-1");
    expect(prisma.pollVote.create).toHaveBeenCalledWith({ data: { optionId: "option-1", userId: "user-1" } });
  });
});

describe("postService.likePost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects liking a post that doesn't exist", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(postService.likePost("post-1", "user-1", "❤️")).rejects.toThrow(AppError);
  });

  it("upserts the reaction (replacing any previous emoji) rather than stacking multiple rows", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", deletedAt: null, authorId: "author-1" });

    await postService.likePost("post-1", "user-2", "🔥");

    expect(prisma.like.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postId_userId: { postId: "post-1", userId: "user-2" } },
        update: { emoji: "🔥" },
        create: { postId: "post-1", userId: "user-2", emoji: "🔥" },
      })
    );
  });

  it("does not notify yourself for liking your own post", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", deletedAt: null, authorId: "user-1" });

    await postService.likePost("post-1", "user-1", "❤️");
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("notifies the post author when someone else likes their post", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "post-1", deletedAt: null, authorId: "author-1" });

    await postService.likePost("post-1", "user-2", "❤️");
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipientId: "author-1", actorId: "user-2", type: "LIKE" }) })
    );
  });
});

describe("postService.pinPost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects pinning someone else's post", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "post-1",
      deletedAt: null,
      authorId: "someone-else",
    });
    await expect(postService.pinPost("post-1", "user-1")).rejects.toThrow(AppError);
  });

  it("unpins any existing pinned post before pinning the new one", async () => {
    (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "post-1",
      deletedAt: null,
      authorId: "user-1",
    });

    await postService.pinPost("post-1", "user-1");
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

function fakePostRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    author: { id: "author-1", username: "author", fullName: null, avatarUrl: null, isVerified: false },
    content: "hello #world",
    visibility: "PUBLIC",
    isPinned: false,
    isEdited: false,
    createdAt: new Date("2026-01-01"),
    publishedAt: new Date("2026-01-01"),
    scheduledFor: null,
    media: [],
    poll: null,
    likes: [],
    originalPost: null,
    _count: { comments: 0, reposts: 0, bookmarks: 0 },
    ...overrides,
  };
}

describe("postService.searchPosts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches on post content and respects public visibility for an anonymous viewer", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([fakePostRow()]);

    const result = await postService.searchPosts(undefined, "hello", undefined, 20);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          content: { contains: "hello", mode: "insensitive" },
          visibility: "PUBLIC",
        }),
      })
    );
    expect(result.items).toHaveLength(1);
  });
});

describe("postService.getPostsByHashtag", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes a leading # and lowercases the tag before querying", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([fakePostRow()]);

    await postService.getPostsByHashtag("#WorldNews", undefined, undefined, 20);

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hashtags: { some: { hashtag: { tag: "worldnews" } } } }),
      })
    );
  });
});
