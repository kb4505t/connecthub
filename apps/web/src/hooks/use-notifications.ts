import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { NotificationDTO } from "@connecthub/shared-types";

interface PaginatedNotificationsResponse {
  success: true;
  data: { items: NotificationDTO[]; nextCursor: string | null };
}

interface UnreadCountResponse {
  success: true;
  data: { count: number };
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedNotificationsResponse>("/notifications", { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiClient.get<UnreadCountResponse>("/notifications/unread-count"),
    select: (res) => res.data.count,
    // Realtime events keep this fresh while the socket is connected; this is
    // just a fallback in case a socket event is ever missed (dropped connection, etc).
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
