import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CommentDTO } from "@connecthub/shared-types";

interface PaginatedCommentsResponse {
  success: true;
  data: { items: CommentDTO[]; nextCursor: string | null };
}

function invalidateComments(queryClient: ReturnType<typeof useQueryClient>, postId: string, parentId?: string | null) {
  queryClient.invalidateQueries({ queryKey: ["comments", postId] });
  if (parentId) queryClient.invalidateQueries({ queryKey: ["replies", parentId] });
  // Reply/comment counts live on the post DTO too, in feed/profile lists
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["profile-posts"] });
  queryClient.invalidateQueries({ queryKey: ["post", postId] });
}

export function useComments(postId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["comments", postId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedCommentsResponse>(`/posts/${postId}/comments`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!postId,
  });
}

export function useReplies(commentId: string | undefined, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["replies", commentId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedCommentsResponse>(`/comments/${commentId}/replies`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: enabled && !!commentId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      apiClient.post(`/posts/${postId}/comments`, { content, parentId }),
    onSuccess: (_data, variables) => invalidateComments(queryClient, postId, variables.parentId),
  });
}

export function useUpdateComment(postId: string, parentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      apiClient.patch(`/comments/${commentId}`, { content }),
    onSuccess: () => invalidateComments(queryClient, postId, parentId),
  });
}

export function useDeleteComment(postId: string, parentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/comments/${commentId}`),
    onSuccess: () => invalidateComments(queryClient, postId, parentId),
  });
}

export function useReactToComment(postId: string, parentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      apiClient.post(`/comments/${commentId}/react`, { emoji }),
    onSuccess: () => invalidateComments(queryClient, postId, parentId),
  });
}

export function useRemoveCommentReaction(postId: string, parentId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/comments/${commentId}/react`),
    onSuccess: () => invalidateComments(queryClient, postId, parentId),
  });
}
