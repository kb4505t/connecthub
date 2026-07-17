import { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import { emitToUser } from "../realtime/socket";

const notificationInclude = {
  actor: { select: { id: true, username: true, fullName: true, avatarUrl: true, isVerified: true } },
} satisfies Prisma.NotificationInclude;

type NotificationWithIncludes = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

function toNotificationDTO(n: NotificationWithIncludes) {
  return {
    id: n.id,
    type: n.type,
    actor: n.actor,
    postId: n.postId,
    commentId: n.commentId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export interface CreateNotificationInput {
  type: NotificationType;
  recipientId: string;
  actorId: string;
  postId?: string;
  commentId?: string;
}

export const notificationService = {
  /**
   * The single place every other service (post, comment, user...) calls to
   * raise a notification — replaces what used to be inline `prisma.notification.create()`
   * calls scattered across those services. Centralizing it here means every
   * notification, regardless of trigger, gets the same two guarantees for free:
   * it's never sent for a user's own activity, and it's pushed over the socket
   * the instant it's created rather than waiting for the next poll.
   *
   * Best-effort by design, same as the inline calls it replaces: a failure to
   * write a notification (or push it over the socket) should never fail the
   * like/comment/follow/mention/repost action that triggered it.
   */
  async create(input: CreateNotificationInput) {
    if (input.recipientId === input.actorId) return; // never notify yourself

    try {
      const notification = await prisma.notification.create({
        data: input,
        include: notificationInclude,
      });
      emitToUser(input.recipientId, "notification:new", toNotificationDTO(notification));
    } catch {
      // best-effort — swallow so the caller's primary action still succeeds
    }
  },

  async getNotifications(userId: string, cursor: string | undefined, limit: number) {
    const rows = await prisma.notification.findMany({
      where: { recipientId: userId },
      include: notificationInclude,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return { items: items.map(toNotificationDTO), nextCursor };
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
  },

  async markAsRead(notificationId: string, userId: string) {
    // updateMany (not update) so this both scopes to the owner in one query
    // and doesn't throw a Prisma "record not found" for someone else's id —
    // we turn that into our own 404 instead, for a consistent error shape.
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { isRead: true },
    });
    if (result.count === 0) throw AppError.notFound("Notification not found");
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  },
};
