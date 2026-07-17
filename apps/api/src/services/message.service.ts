import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { notificationService } from "./notification.service";
import { storageService } from "./storage.service";
import { emitToConversation, joinConversationRoom, isUserOnline } from "../realtime/socket";

const participantUserSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const conversationInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { sender: { select: participantUserSelect } },
  },
} satisfies Prisma.ConversationInclude;

const messageInclude = {
  sender: { select: participantUserSelect },
} satisfies Prisma.MessageInclude;

type ConversationWithIncludes = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;
type MessageWithSender = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

function toMessageDTO(m: MessageWithSender) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    sender: m.sender,
    content: m.content,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
  };
}

/** `viewerId` decides whose `lastReadAt` unread messages are counted against, and is excluded from the participant list's "self" entry treatment. */
async function toConversationDTO(c: ConversationWithIncludes, viewerId: string) {
  const viewerParticipant = c.participants.find((p) => p.userId === viewerId);

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: c.id,
      senderId: { not: viewerId },
      deletedAt: null,
      createdAt: viewerParticipant?.lastReadAt ? { gt: viewerParticipant.lastReadAt } : undefined,
    },
  });

  const lastMessage = c.messages[0] ? toMessageDTO(c.messages[0]) : null;

  return {
    id: c.id,
    type: c.type,
    name: c.name,
    participants: c.participants.map((p) => ({ ...p.user, lastReadAt: p.lastReadAt?.toISOString() ?? null })),
    lastMessage,
    unreadCount,
    updatedAt: c.updatedAt.toISOString(),
  };
}

/** Throws if `userId` isn't (or is no longer) a participant of `conversationId` — the gate every conversation-scoped action shares. */
async function requireParticipant(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw AppError.notFound("Conversation not found");
  return participant;
}

async function isBlockedEitherWay(userAId: string, userBId: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userAId, blockedId: userBId },
        { blockerId: userBId, blockedId: userAId },
      ],
    },
  });
  return !!block;
}

async function createAndBroadcastMessage(
  conversationId: string,
  userId: string,
  data: { content?: string; mediaUrl?: string; mediaType?: "IMAGE" | "VIDEO" }
) {
  await requireParticipant(conversationId, userId);

  if (!data.content && !data.mediaUrl) {
    throw AppError.badRequest("A message needs text or an attachment");
  }

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: { participants: true },
  });

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: data.content ?? null,
      mediaUrl: data.mediaUrl ?? null,
      mediaType: data.mediaType ?? null,
    },
    include: messageInclude,
  });

  // Touch the conversation so it resorts to the top of everyone's list.
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const dto = toMessageDTO(message);
  emitToConversation(conversationId, "message:new", dto);

  const recipients = conversation.participants.filter((p) => p.userId !== userId);
  for (const recipient of recipients) {
    // Skip the notification (but not the message itself) if they're already
    // looking at a live connection — avoids a redundant bell notification
    // for someone actively chatting. Best-effort like every other
    // notification: never throws back into the send flow.
    if (isUserOnline(recipient.userId)) continue;
    await notificationService.create({
      type: "MESSAGE",
      recipientId: recipient.userId,
      actorId: userId,
    });
  }

  return dto;
}

export const messageService = {
  async getConversations(userId: string, cursor: string | undefined, limit: number) {
    const rows = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: conversationInclude,
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return { items: await Promise.all(items.map((c) => toConversationDTO(c, userId))), nextCursor };
  },

  async getConversationById(conversationId: string, userId: string) {
    await requireParticipant(conversationId, userId);
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: conversationInclude,
    });
    return toConversationDTO(conversation, userId);
  },

  /** Finds the existing 1:1 conversation between the two users, or creates one — DIRECT conversations are never duplicated. */
  async getOrCreateDirectConversation(userId: string, targetUsername: string) {
    const target = await prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw AppError.notFound("User not found");
    if (target.id === userId) throw AppError.badRequest("You can't message yourself");

    if (await isBlockedEitherWay(userId, target.id)) {
      throw AppError.forbidden("You can't message this user");
    }

    // A DIRECT conversation always has exactly these two participants — no
    // dedicated "conversation key" column exists for this, so the existing
    // one (if any) is found by intersecting each user's DIRECT conversations
    // rather than a single indexed lookup. Fine at this project's scale;
    // a computed unique key (e.g. sorted user id pair) would be the fix if
    // this ever needed to scale to heavy DM traffic.
    const existing = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: target.id } } }],
      },
      include: conversationInclude,
    });
    if (existing) return toConversationDTO(existing, userId);

    const created = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        participants: { create: [{ userId }, { userId: target.id }] },
      },
      include: conversationInclude,
    });

    joinConversationRoom(userId, created.id);
    joinConversationRoom(target.id, created.id);

    return toConversationDTO(created, userId);
  },

  async createGroupConversation(userId: string, name: string, usernames: string[]) {
    const uniqueUsernames = Array.from(new Set(usernames));
    const users = await prisma.user.findMany({ where: { username: { in: uniqueUsernames } } });

    const otherMembers = [];
    for (const member of users) {
      if (member.id === userId) continue;
      if (await isBlockedEitherWay(userId, member.id)) continue; // silently skip — blocked relationships never surface in either direction
      otherMembers.push(member);
    }

    if (otherMembers.length < 2) {
      throw AppError.badRequest("A group needs at least 2 other valid, non-blocked members");
    }

    const created = await prisma.conversation.create({
      data: {
        type: "GROUP",
        name,
        participants: { create: [{ userId }, ...otherMembers.map((m) => ({ userId: m.id }))] },
      },
      include: conversationInclude,
    });

    [userId, ...otherMembers.map((m) => m.id)].forEach((id) => joinConversationRoom(id, created.id));

    return toConversationDTO(created, userId);
  },

  async leaveConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw AppError.notFound("Conversation not found");
    if (conversation.type === "DIRECT") throw AppError.badRequest("You can't leave a direct message conversation");

    await requireParticipant(conversationId, userId);
    await prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
    emitToConversation(conversationId, "conversation:member-left", { conversationId, userId });
  },

  async getMessages(conversationId: string, userId: string, cursor: string | undefined, limit: number) {
    await requireParticipant(conversationId, userId);

    const rows = await prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return { items: items.map(toMessageDTO), nextCursor };
  },

  async sendTextMessage(conversationId: string, userId: string, content: string) {
    return createAndBroadcastMessage(conversationId, userId, { content });
  },

  async sendMediaMessage(
    conversationId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string },
    content?: string
  ) {
    let mediaUrl: string;
    let mediaType: "IMAGE" | "VIDEO";

    if (file.mimetype.startsWith("image/")) {
      const uploaded = await storageService.uploadMessageImage(userId, file.buffer);
      mediaUrl = uploaded.url;
      mediaType = "IMAGE";
    } else {
      // Voice notes are recorded/uploaded as short audio clips; the schema's
      // MediaType only distinguishes IMAGE/VIDEO, so a voice note is stored
      // as VIDEO (audio-only "video") rather than adding a third enum value
      // just for chat. The client tells the two apart by mimetype/UI context,
      // not by this field.
      mediaUrl = await storageService.uploadVoiceMessage(userId, file.buffer, file.mimetype);
      mediaType = "VIDEO";
    }

    return createAndBroadcastMessage(conversationId, userId, { content, mediaUrl, mediaType });
  },

  async markConversationRead(conversationId: string, userId: string) {
    await requireParticipant(conversationId, userId);
    const now = new Date();

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: now },
    });

    // Message.isRead is a single flag, not per-participant — meaningful for
    // DIRECT chats (exactly one other reader) but ambiguous for GROUP chats
    // (several possible readers). Only flip it here for DIRECT conversations;
    // group unread state is tracked purely via `lastReadAt` above.
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (conversation?.type === "DIRECT") {
      await prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, isRead: false },
        data: { isRead: true },
      });
    }

    emitToConversation(conversationId, "message:read", { conversationId, userId, readAt: now.toISOString() });
  },
};
