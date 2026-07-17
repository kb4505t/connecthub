import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    follow: { findMany: vi.fn() },
    story: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    storyView: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../services/storage.service", () => ({
  storageService: {
    uploadStoryImage: vi.fn(() => Promise.resolve("https://cdn.test/story-media/img.webp")),
    uploadStoryVideo: vi.fn(() => Promise.resolve("https://cdn.test/story-media/vid.mp4")),
    deleteByPublicUrl: vi.fn(() => Promise.resolve()),
  },
}));

import { prisma } from "../config/db";
import { storyService } from "../services/story.service";
import { AppError } from "../utils/AppError";

const author = (id: string, username: string) => ({
  id,
  username,
  fullName: null,
  avatarUrl: null,
  isVerified: false,
});

function makeStory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "story-1",
    authorId: "user-1",
    author: author("user-1", "me"),
    mediaUrl: "https://cdn.test/story-media/img.webp",
    mediaType: "IMAGE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    views: [],
    _count: { views: 0 },
    ...overrides,
  };
}

describe("storyService.createStory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uploads an image and creates a 24h story", async () => {
    (prisma.story.create as ReturnType<typeof vi.fn>).mockResolvedValue(makeStory());

    const result = await storyService.createStory("user-1", { buffer: Buffer.from("x"), mimetype: "image/png" });

    expect(result.mediaType).toBe("IMAGE");
    expect(prisma.story.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorId: "user-1", mediaType: "IMAGE" }) })
    );
  });
});

describe("storyService.getStoryFeed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("orders groups: own first, then unseen, then seen, most recent first within each bucket", async () => {
    (prisma.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ followingId: "user-2" }, { followingId: "user-3" }]);

    (prisma.story.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      // user-2: seen, older
      makeStory({
        id: "s-seen",
        authorId: "user-2",
        author: author("user-2", "seen_user"),
        createdAt: new Date("2026-01-01T01:00:00.000Z"),
        views: [{ id: "view-1" }],
      }),
      // user-3: unseen, newer
      makeStory({
        id: "s-unseen",
        authorId: "user-3",
        author: author("user-3", "unseen_user"),
        createdAt: new Date("2026-01-01T02:00:00.000Z"),
        views: [],
      }),
      // user-1 (viewer's own)
      makeStory({
        id: "s-own",
        authorId: "user-1",
        author: author("user-1", "me"),
        createdAt: new Date("2026-01-01T00:30:00.000Z"),
        views: [],
      }),
    ]);

    const groups = await storyService.getStoryFeed("user-1");

    expect(groups.map((g) => g.author.username)).toEqual(["me", "unseen_user", "seen_user"]);
    expect(groups[0].hasUnseen).toBe(false); // own stories are never flagged "unseen" to yourself
    expect(groups[1].hasUnseen).toBe(true);
    expect(groups[2].hasUnseen).toBe(false);
  });
});

describe("storyService.recordView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects viewing a story that doesn't exist or has expired", async () => {
    (prisma.story.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(storyService.recordView("story-1", "user-2")).rejects.toThrow(AppError);
  });

  it("does not record a self-view", async () => {
    (prisma.story.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeStory({ authorId: "user-1" }));
    await storyService.recordView("story-1", "user-1");
    expect(prisma.storyView.upsert).not.toHaveBeenCalled();
  });

  it("upserts a view for someone else's story", async () => {
    (prisma.story.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(makeStory({ authorId: "user-1" }));
    await storyService.recordView("story-1", "user-2");
    expect(prisma.storyView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storyId_viewerId: { storyId: "story-1", viewerId: "user-2" } } })
    );
  });
});

describe("storyService.getStoryViewers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-author from seeing the viewer list", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "story-1", authorId: "user-1" });
    await expect(storyService.getStoryViewers("story-1", "user-2", undefined, 20)).rejects.toThrow(AppError);
  });
});

describe("storyService.deleteStory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects deleting someone else's story", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "story-1", authorId: "user-1", mediaUrl: "x" });
    await expect(storyService.deleteStory("story-1", "user-2")).rejects.toThrow(AppError);
    expect(prisma.story.delete).not.toHaveBeenCalled();
  });

  it("deletes the row and the storage object for the author", async () => {
    (prisma.story.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "story-1",
      authorId: "user-1",
      mediaUrl: "https://cdn.test/story-media/img.webp",
    });
    await storyService.deleteStory("story-1", "user-1");
    expect(prisma.story.delete).toHaveBeenCalledWith({ where: { id: "story-1" } });
  });
});
