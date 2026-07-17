"use client";

import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { NotificationDTO } from "@connecthub/shared-types";

interface NotificationsPage {
  success: true;
  data: { items: NotificationDTO[]; nextCursor: string | null };
}

/**
 * Opens the realtime connection once the user is authenticated and streams
 * incoming `notification:new` events straight into the React Query cache —
 * new notifications (and the unread badge) appear instantly without polling.
 * Mounted once, high up the tree (main layout), so it stays alive across
 * route changes instead of reconnecting on every page.
 */
export function useNotificationSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken || !userId) return;

    const socket = getSocket();
    socket.auth = { token: accessToken };
    if (!socket.connected) socket.connect();

    function handleNewNotification(notification: NotificationDTO) {
      queryClient.setQueryData<InfiniteData<NotificationsPage>>(["notifications"], (old) => {
        if (!old) return old;
        const [firstPage, ...rest] = old.pages;
        const updatedFirstPage: NotificationsPage = {
          ...firstPage,
          data: { ...firstPage.data, items: [notification, ...firstPage.data.items] },
        };
        return { ...old, pages: [updatedFirstPage, ...rest] };
      });

      queryClient.setQueryData<{ success: true; data: { count: number } }>(
        ["notifications", "unread-count"],
        (old) => (old ? { ...old, data: { count: old.data.count + 1 } } : old)
      );
    }

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [accessToken, userId, queryClient]);

  // Tear the connection down on logout rather than leaving a stale, unauthenticated socket open.
  useEffect(() => {
    if (!accessToken) disconnectSocket();
  }, [accessToken]);
}
