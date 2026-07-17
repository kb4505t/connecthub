import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../config/logger";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/db";

interface AuthedSocket extends Socket {
  userId?: string;
}

/**
 * Central place where all Socket.IO event handlers are registered.
 * Kept separate from server.ts so realtime logic (Phases 9 & 10:
 * notifications, messaging, typing indicators, online presence) has
 * a dedicated home instead of bloating the bootstrap file.
 */

// Stashed so `emitToUser` (called from services, nowhere near the Express req/res
// cycle) can reach the same io instance server.ts created — same singleton
// pattern as config/db.ts's Prisma client, just for Socket.IO instead.
let ioInstance: SocketIOServer | null = null;

// Tracks every open socket per user (multiple tabs/devices count as one
// "online" user). A user only flips to offline once their last socket
// disconnects — otherwise closing one tab would incorrectly broadcast them
// as offline while another tab is still connected.
const onlineSockets = new Map<string, Set<string>>();

export function isUserOnline(userId: string): boolean {
  return (onlineSockets.get(userId)?.size ?? 0) > 0;
}

async function conversationRoomsForUser(userId: string): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  return rows.map((r) => `conversation:${r.conversationId}`);
}

/** True only if `userId` is an active participant of `conversationId` — used to gate room joins and typing events. */
async function isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!membership;
}

export function registerSocketHandlers(io: SocketIOServer) {
  ioInstance = io;

  // Auth handshake: every socket connection must present the same short-lived
  // access token used for REST requests, via `auth: { token }` on the client
  // (not a query string — those end up in server access logs). Connections
  // without a valid token are rejected before `connection` ever fires.
  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("Missing token");
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const userId = socket.userId!;
    logger.debug(`Socket connected: ${socket.id} (user ${userId})`);

    // Every one of a user's open tabs/devices joins the same private room, so
    // `emitToUser` reaches all of them at once without us tracking socket ids
    // ourselves. Room membership is scoped to this connection's lifetime only.
    socket.join(`user:${userId}`);

    const wasOffline = !isUserOnline(userId);
    if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
    onlineSockets.get(userId)!.add(socket.id);

    // Join every conversation this user is part of so `emitToConversation`
    // reaches them without a per-message DB lookup, and so presence/typing
    // broadcasts (scoped to a conversation room) include them immediately.
    conversationRoomsForUser(userId)
      .then((rooms) => {
        rooms.forEach((room) => socket.join(room));
        // Only announce "online" the first time this user's presence flips —
        // a second tab connecting shouldn't re-broadcast what peers already know.
        if (wasOffline) {
          rooms.forEach((room) => socket.to(room).emit("presence:update", { userId, online: true }));
        }
      })
      .catch((err) => logger.warn(`Failed to join conversation rooms for ${userId}: ${(err as Error).message}`));

    // Sender must already be a participant (checked once, at join time) —
    // rejecting here means a bad actor can't listen in on someone else's chat
    // just by guessing a conversation id.
    socket.on("conversation:join", async (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      const allowed = await isConversationParticipant(conversationId, userId).catch(() => false);
      if (allowed) socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId: string) => {
      if (typeof conversationId === "string") socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      socket.to(`conversation:${conversationId}`).emit("typing:start", { conversationId, userId });
    });

    socket.on("typing:stop", (conversationId: string) => {
      if (typeof conversationId !== "string") return;
      socket.to(`conversation:${conversationId}`).emit("typing:stop", { conversationId, userId });
    });

    socket.on("disconnect", (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
      const sockets = onlineSockets.get(userId);
      sockets?.delete(socket.id);

      if (sockets && sockets.size === 0) {
        onlineSockets.delete(userId);
        conversationRoomsForUser(userId)
          .then((rooms) => rooms.forEach((room) => io.to(room).emit("presence:update", { userId, online: false })))
          .catch(() => {
            // Non-fatal: peers will simply see this user as offline the next time
            // presence is queried, rather than via an instant broadcast.
          });
      }
    });
  });
}

/**
 * Pushes a realtime event to every connected socket for a given user.
 * Fire-and-forget by design: if the user has no open connection right now,
 * this is a silent no-op — they'll see the update next time they fetch
 * (notifications are also persisted to the DB, so nothing is actually lost).
 */
export function emitToUser(userId: string, event: string, payload: unknown) {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

/** Pushes a realtime event to every participant currently connected to a conversation (new messages, read receipts). */
export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  ioInstance?.to(`conversation:${conversationId}`).emit(event, payload);
}

/**
 * Joins every open socket a user currently has to a conversation's room.
 * Needed because room membership is normally established once, at connect
 * time (`conversationRoomsForUser`) — a conversation created *after* that
 * (e.g. a brand-new DM or group) wouldn't otherwise reach an already-connected
 * participant until their next reconnect. Called by message.service right
 * after creating a conversation.
 */
export function joinConversationRoom(userId: string, conversationId: string) {
  const socketIds = onlineSockets.get(userId);
  if (!socketIds || !ioInstance) return;
  const room = `conversation:${conversationId}`;
  socketIds.forEach((id) => ioInstance?.sockets.sockets.get(id)?.join(room));
}
