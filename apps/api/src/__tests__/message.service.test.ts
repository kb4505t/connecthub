import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    block: { findFirst: vi.fn() },
    conversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversationParticipant: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    message: { create: vi.fn(), count: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../realtime/socket", () => ({
  emitToConversation: vi.fn(),
  joinConversationRoom: vi.fn(),
  isUserOnline: vi.fn(() => false),
}));

const { mockNotificationCreate } = vi.hoisted(() => ({ mockNotificationCreate: vi.fn(() => Promise.resolve()) }));
vi.mock("../services/notification.service", () => ({
  notificationService: { create: mockNotificationCreate },
}));

import { prisma } from "../config/db";
import { emitToConversation } from "../realtime/socket";
import { notificationService } from "../services/notification.service";
import { messageService } from "../services/message.service";
import { AppError } from "../utils/AppError";

const userSummary = (id: string, username: string) => ({
  id,
  username,
  fullName: null,
  avatarUrl: null,
  isVerified: false,
});

describe("messageService.getOrCreateDirectConversation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects messaging yourself", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", username: "me" });
    await expect(messageService.getOrCreateDirectConversation("user-1", "me")).rejects.toThrow(AppError);
  });

  it("rejects starting a conversation with a user who doesn't exist", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(messageService.getOrCreateDirectConversation("user-1", "ghost")).rejects.toThrow(AppError);
  });

  it("blocks messaging when either side has blocked the other", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", username: "them" });
    (prisma.block.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "block-1" });

    await expect(messageService.getOrCreateDirectConversation("user-1", "them")).rejects.toThrow(AppError);
    expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
  });

  it("reuses an existing DIRECT conversation instead of creating a duplicate", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", username: "them" });
    (prisma.block.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.conversation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "convo-1",
      type: "DIRECT",
      name: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      participants: [
        { userId: "user-1", lastReadAt: null, user: userSummary("user-1", "me") },
        { userId: "user-2", lastReadAt: null, user: userSummary("user-2", "them") },
      ],
      messages: [],
    });
    (prisma.message.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await messageService.getOrCreateDirectConversation("user-1", "them");

    expect(result.id).toBe("convo-1");
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
});

describe("messageService.sendTextMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects sending to a conversation the caller doesn't belong to", async () => {
    (prisma.conversationParticipant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(messageService.sendTextMessage("convo-1", "user-1", "hi")).rejects.toThrow(AppError);
  });

  it("creates the message, touches the conversation, broadcasts it, and notifies offline recipients", async () => {
    (prisma.conversationParticipant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversationId: "convo-1",
      userId: "user-1",
    });
    (prisma.conversation.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "convo-1",
      participants: [{ userId: "user-1" }, { userId: "user-2" }],
    });
    (prisma.message.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "msg-1",
      conversationId: "convo-1",
      content: "hi",
      mediaUrl: null,
      mediaType: null,
      isRead: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      sender: userSummary("user-1", "me"),
    });

    const result = await messageService.sendTextMessage("convo-1", "user-1", "hi");

    expect(result.content).toBe("hi");
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: "convo-1" },
      data: { updatedAt: expect.any(Date) },
    });
    expect(emitToConversation).toHaveBeenCalledWith("convo-1", "message:new", expect.objectContaining({ id: "msg-1" }));
    expect(notificationService.create).toHaveBeenCalledWith({
      type: "MESSAGE",
      recipientId: "user-2",
      actorId: "user-1",
    });
  });
});

describe("messageService.markConversationRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates lastReadAt and flips isRead on the other participant's messages for a DIRECT conversation", async () => {
    (prisma.conversationParticipant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversationId: "convo-1",
      userId: "user-1",
    });
    (prisma.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "convo-1", type: "DIRECT" });

    await messageService.markConversationRead("convo-1", "user-1");

    expect(prisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: "convo-1", userId: "user-1" } },
      data: { lastReadAt: expect.any(Date) },
    });
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { conversationId: "convo-1", senderId: { not: "user-1" }, isRead: false },
      data: { isRead: true },
    });
    expect(emitToConversation).toHaveBeenCalledWith("convo-1", "message:read", expect.objectContaining({ userId: "user-1" }));
  });

  it("does not touch Message.isRead for a GROUP conversation — only lastReadAt", async () => {
    (prisma.conversationParticipant.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversationId: "convo-1",
      userId: "user-1",
    });
    (prisma.conversation.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "convo-1", type: "GROUP" });

    await messageService.markConversationRead("convo-1", "user-1");

    expect(prisma.message.updateMany).not.toHaveBeenCalled();
  });
});
