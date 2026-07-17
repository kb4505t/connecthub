import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    post: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    comment: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    report: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    hashtag: { findMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

import { prisma } from "../config/db";
import { adminService } from "../services/admin.service";
import { AppError } from "../utils/AppError";

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe("adminService.banUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an admin trying to ban themselves", async () => {
    await expect(adminService.banUser("admin-1", "admin-1", "spam")).rejects.toThrow(AppError);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("throws 404 when the target user doesn't exist", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue(null);
    await expect(adminService.banUser("admin-1", "ghost", "spam")).rejects.toThrow(AppError);
  });

  it("refuses to ban another admin", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "user-2", isAdmin: true });
    await expect(adminService.banUser("admin-1", "user-2", "spam")).rejects.toThrow(AppError);
  });

  it("bans the user and revokes their refresh tokens in one transaction", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "user-2", isAdmin: false });

    await adminService.banUser("admin-1", "user-2", "Repeated harassment");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-2" },
        data: expect.objectContaining({ isBanned: true, banReason: "Repeated harassment" }),
      })
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-2", revoked: false }, data: { revoked: true } })
    );
  });
});

describe("adminService.resolveReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws 404 for an unknown report", async () => {
    asMock(prisma.report.findUnique).mockResolvedValue(null);
    await expect(adminService.resolveReport("admin-1", "report-1", { action: "DISMISS" })).rejects.toThrow(AppError);
  });

  it("rejects re-resolving an already-resolved report", async () => {
    asMock(prisma.report.findUnique).mockResolvedValue({ id: "report-1", status: "RESOLVED" });
    await expect(adminService.resolveReport("admin-1", "report-1", { action: "DISMISS" })).rejects.toThrow(AppError);
  });

  it("dismisses a report without touching any content", async () => {
    asMock(prisma.report.findUnique).mockResolvedValue({
      id: "report-1",
      status: "PENDING",
      targetType: "POST",
      targetId: "post-1",
      reason: "spam",
    });

    await adminService.resolveReport("admin-1", "report-1", { action: "DISMISS", note: "not spam" });

    expect(prisma.post.update).not.toHaveBeenCalled();
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-1" },
        data: expect.objectContaining({ status: "DISMISSED", reviewerId: "admin-1", actionTaken: "DISMISS" }),
      })
    );
  });

  it("soft-deletes the reported post on REMOVE_CONTENT", async () => {
    asMock(prisma.report.findUnique).mockResolvedValue({
      id: "report-1",
      status: "PENDING",
      targetType: "POST",
      targetId: "post-1",
      reason: "spam",
    });
    asMock(prisma.post.findUnique).mockResolvedValue({ id: "post-1", deletedAt: null });

    await adminService.resolveReport("admin-1", "report-1", { action: "REMOVE_CONTENT" });

    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "post-1" }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) })
    );
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "RESOLVED", actionTaken: "REMOVE_CONTENT" }) })
    );
  });

  it("bans the post author on BAN_USER", async () => {
    asMock(prisma.report.findUnique).mockResolvedValue({
      id: "report-1",
      status: "PENDING",
      targetType: "POST",
      targetId: "post-1",
      reason: "harassment",
    });
    asMock(prisma.post.findUnique).mockResolvedValue({ authorId: "user-2" });
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "user-2", isAdmin: false });

    await adminService.resolveReport("admin-1", "report-1", { action: "BAN_USER" });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-2" }, data: expect.objectContaining({ isBanned: true }) })
    );
  });
});
