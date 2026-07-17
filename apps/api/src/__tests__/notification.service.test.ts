import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../realtime/socket", () => ({
  emitToUser: vi.fn(),
}));

import { prisma } from "../config/db";
import { emitToUser } from "../realtime/socket";
import { notificationService } from "../services/notification.service";
import { AppError } from "../utils/AppError";

const actorMock = { id: "actor-1", username: "actor", fullName: null, avatarUrl: null, isVerified: false };

describe("notificationService.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never creates a notification for a user's own activity", async () => {
    await notificationService.create({ type: "LIKE", recipientId: "user-1", actorId: "user-1", postId: "post-1" });

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it("creates the notification and pushes it over the socket to the recipient", async () => {
    (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "notif-1",
      type: "LIKE",
      recipientId: "author-1",
      actorId: "actor-1",
      actor: actorMock,
      postId: "post-1",
      commentId: null,
      isRead: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await notificationService.create({ type: "LIKE", recipientId: "author-1", actorId: "actor-1", postId: "post-1" });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { type: "LIKE", recipientId: "author-1", actorId: "actor-1", postId: "post-1" } })
    );
    expect(emitToUser).toHaveBeenCalledWith(
      "author-1",
      "notification:new",
      expect.objectContaining({ id: "notif-1", type: "LIKE", isRead: false })
    );
  });

  it("swallows DB failures — the triggering action must never fail because a notification couldn't be written", async () => {
    (prisma.notification.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB down"));

    await expect(
      notificationService.create({ type: "FOLLOW", recipientId: "user-2", actorId: "user-1" })
    ).resolves.toBeUndefined();
    expect(emitToUser).not.toHaveBeenCalled();
  });
});

describe("notificationService.markAsRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws not found if the notification doesn't belong to the caller", async () => {
    (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    await expect(notificationService.markAsRead("notif-1", "user-1")).rejects.toThrow(AppError);
  });

  it("marks the notification read when it belongs to the caller", async () => {
    (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    await expect(notificationService.markAsRead("notif-1", "user-1")).resolves.toBeUndefined();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "notif-1", recipientId: "user-1" },
      data: { isRead: true },
    });
  });
});

describe("notificationService.getUnreadCount", () => {
  it("counts only unread notifications for the given recipient", async () => {
    (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    const count = await notificationService.getUnreadCount("user-1");
    expect(count).toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { recipientId: "user-1", isRead: false } });
  });
});
