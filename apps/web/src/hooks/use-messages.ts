import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { ConversationDTO, MessageDTO } from "@connecthub/shared-types";

interface PaginatedConversationsResponse {
  success: true;
  data: { items: ConversationDTO[]; nextCursor: string | null };
}

interface SingleConversationResponse {
  success: true;
  data: { conversation: ConversationDTO };
}

interface PaginatedMessagesResponse {
  success: true;
  data: { items: MessageDTO[]; nextCursor: string | null };
}

interface SingleMessageResponse {
  success: true;
  data: { message: MessageDTO };
}

export function useConversations() {
  return useInfiniteQuery({
    queryKey: ["conversations"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedConversationsResponse>("/conversations", { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

/** Total unread across every conversation — powers the navbar badge, same idea as useUnreadNotificationCount. */
export function useTotalUnreadMessages() {
  const { data } = useConversations();
  const total = data?.pages.flatMap((p) => p.data.items).reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
  return total;
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => apiClient.get<SingleConversationResponse>(`/conversations/${conversationId}`),
    select: (res) => res.data.conversation,
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedMessagesResponse>(`/conversations/${conversationId}/messages`, {
        params: { cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!conversationId,
  });
}

export function useStartDirectConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => apiClient.post<SingleConversationResponse>("/conversations/direct", { username }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useCreateGroupConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; usernames: string[] }) =>
      apiClient.post<SingleConversationResponse>("/conversations/group", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useLeaveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => apiClient.delete(`/conversations/${conversationId}/leave`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/** Optimistically appends the new message to the thread cache and bumps the conversation to the top of the list. */
function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: MessageDTO
) {
  queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(["messages", conversationId], (old) => {
    if (!old) return old;
    const [firstPage, ...rest] = old.pages;
    return {
      ...old,
      pages: [{ ...firstPage, data: { ...firstPage.data, items: [message, ...firstPage.data.items] } }, ...rest],
    };
  });
  queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiClient.post<SingleMessageResponse>(`/conversations/${conversationId}/messages`, { content }),
    onSuccess: (res) => appendMessageToCache(queryClient, conversationId, res.data.message),
  });
}

/**
 * Sends an image or voice-note attachment. Accepts FormData directly (built
 * by the composer) since this is always multipart/form-data — same reasoning
 * as useCreatePost for post media.
 */
export function useSendMediaMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch(`${base}/conversations/${conversationId}/messages/media`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Failed to send attachment");
      return data as SingleMessageResponse;
    },
    onSuccess: (res) => appendMessageToCache(queryClient, conversationId, res.data.message),
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => apiClient.patch(`/conversations/${conversationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
