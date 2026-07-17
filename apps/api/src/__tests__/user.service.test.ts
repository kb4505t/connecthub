import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    follow: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    block: { findFirst: vi.fn() },
    notification: { create: vi.fn(() => Promise.resolve({})) },
  },
}));
vi.mock("../services/storage.service", () => ({
  storageService: { uploadAvatar: vi.fn(), uploadCoverImage: vi.fn(), deleteByPublicUrl: vi.fn() },
}));

import { prisma } from "../config/db";
import { userService } from "../services/user.service";
import { AppError } from "../utils/AppError";

describe("userService.followUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects following yourself", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", username: "self" });

    await expect(userService.followUser("user-1", "self")).rejects.toThrow(AppError);
  });

  it("rejects following a user you're blocked by (or have blocked)", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", username: "other" });
    (prisma.block.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "block-1" });

    await expect(userService.followUser("user-1", "other")).rejects.toThrow(AppError);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });

  it("throws 404 when the target user doesn't exist", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(userService.followUser("user-1", "ghost")).rejects.toThrow(AppError);
  });

  it("creates the follow relationship and a notification on success", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", username: "other" });
    (prisma.block.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.follow.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await userService.followUser("user-1", "other");

    expect(prisma.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { followerId_followingId: { followerId: "user-1", followingId: "user-2" } },
      })
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "FOLLOW", recipientId: "user-2", actorId: "user-1" }) })
    );
  });
});

describe("userService.searchUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches on username or full name, case-insensitively", async () => {
    (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-1", username: "janedoe", fullName: "Jane Doe", avatarUrl: null, isVerified: false, bio: "hi" },
    ]);
    (prisma.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await userService.searchUsers(undefined, "jane", undefined, 20);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { username: { contains: "jane", mode: "insensitive" } },
            { fullName: { contains: "jane", mode: "insensitive" } },
          ],
        }),
      })
    );
    expect(result.items).toEqual([
      expect.objectContaining({ id: "user-1", username: "janedoe", isFollowedByViewer: false }),
    ]);
  });

  it("marks isFollowedByViewer using a single batched follow lookup, not one per result", async () => {
    (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "user-1", username: "a", fullName: null, avatarUrl: null, isVerified: false, bio: null },
      { id: "user-2", username: "b", fullName: null, avatarUrl: null, isVerified: false, bio: null },
    ]);
    (prisma.follow.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ followingId: "user-2" }]);

    const result = await userService.searchUsers("viewer-1", "a", undefined, 20);

    expect(prisma.follow.findMany).toHaveBeenCalledTimes(1);
    expect(result.items.find((u) => u.id === "user-1")?.isFollowedByViewer).toBe(false);
    expect(result.items.find((u) => u.id === "user-2")?.isFollowedByViewer).toBe(true);
  });
});
