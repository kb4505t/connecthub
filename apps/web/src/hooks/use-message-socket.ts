"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { getSocket } from "@/lib/socket";
import type { MessageDTO } from "@connecthub/shared-types";

interface MessagesPage {
  success: true;
  data: { items: MessageDTO[]; nextCursor: string | null };
}

/**
 * Streams `message:new` / `message:read` events into the React Query cache
 * for every conversation, not just the one currently open — so the
 * conversation list stays live even while the user is looking elsewhere.
 * Mounted once in the messages layout (mirrors useNotificationSocket, which
 * is mounted once in the main layout for the same reason).
 */
export function useMessageSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken || !userId) return;
    const socket = getSocket();

    function handleNewMessage(message: MessageDTO) {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(["messages", message.conversationId], (old) => {
        if (!old) return old;
        const [firstPage, ...rest] = old.pages;
        // Avoid double-inserting a message this tab already appended optimistically via the mutation's onSuccess.
        if (firstPage.data.items.some((m) => m.id === message.id)) return old;
        return {
          ...old,
          pages: [{ ...firstPage, data: { ...firstPage.data, items: [message, ...firstPage.data.items] } }, ...rest],
        };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    function handleMessageRead(payload: { conversationId: string }) {
      queryClient.invalidateQueries({ queryKey: ["messages", payload.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    socket.on("message:new", handleNewMessage);
    socket.on("message:read", handleMessageRead);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:read", handleMessageRead);
    };
  }, [accessToken, userId, queryClient]);
}

/**
 * Tracks who's currently online across every conversation the user belongs
 * to. Not scoped to a single thread — the server only broadcasts
 * `presence:update` to rooms this socket already auto-joined on connect, so
 * a single global listener is enough for both the conversation list (many
 * people at once) and an open thread (one person).
 */
export function usePresence() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!accessToken) return;
    const socket = getSocket();

    function handlePresenceUpdate(payload: { userId: string; online: boolean }) {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    }

    socket.on("presence:update", handlePresenceUpdate);
    return () => {
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [accessToken]);

  return onlineUserIds;
}

/** Per-thread typing indicator state, plus helpers to announce this user's own typing. Used by the open chat thread page. */
export function useTypingIndicator(conversationId: string | undefined) {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();
    socket.emit("conversation:join", conversationId);

    function handleTypingStart(payload: { conversationId: string; userId: string }) {
      if (payload.conversationId !== conversationId) return;
      setTypingUserIds((prev) => new Set(prev).add(payload.userId));
      clearTimeout(typingTimeoutRef.current[payload.userId]);
      // Auto-clears in case a "typing:stop" is ever dropped (tab closed mid-type, etc).
      typingTimeoutRef.current[payload.userId] = setTimeout(() => {
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(payload.userId);
          return next;
        });
      }, 5000);
    }

    function handleTypingStop(payload: { conversationId: string; userId: string }) {
      if (payload.conversationId !== conversationId) return;
      clearTimeout(typingTimeoutRef.current[payload.userId]);
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
    }

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.emit("conversation:leave", conversationId);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      setTypingUserIds(new Set());
    };
  }, [conversationId]);

  const notifyTypingStart = useCallback(() => {
    if (conversationId) getSocket().emit("typing:start", conversationId);
  }, [conversationId]);

  const notifyTypingStop = useCallback(() => {
    if (conversationId) getSocket().emit("typing:stop", conversationId);
  }, [conversationId]);

  return { typingUserIds, notifyTypingStart, notifyTypingStop };
}
