import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { PostDTO, UpdatePostInput, RepostInput } from "@connecthub/shared-types";

interface PaginatedPostsResponse {
  success: true;
  data: { items: PostDTO[]; nextCursor: string | null };
}

interface SinglePostResponse {
  success: true;
  data: { post: PostDTO };
}

type FeedType = "following" | "latest" | "trending";

function invalidateAllPostLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["profile-posts"] });
  queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
}

export function useFeed(type: FeedType) {
  return useInfiniteQuery({
    queryKey: ["feed", type],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedPostsResponse>("/posts/feed", { params: { type, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function useProfilePosts(username: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["profile-posts", username],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedPostsResponse>(`/users/${username}/posts`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!username,
  });
}

export function useBookmarkedPosts() {
  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedPostsResponse>("/posts/bookmarks", { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => apiClient.get<SinglePostResponse>(`/posts/${postId}`),
    enabled: !!postId,
    select: (res) => res.data.post,
  });
}

/**
 * Creates a post. Accepts FormData directly (built by the composer) rather
 * than a typed object, since this request is always multipart/form-data —
 * it may carry image/video files alongside the text fields.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/posts`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Failed to create post");
      return data as SinglePostResponse;
    },
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useUpdatePost(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePostInput) => apiClient.patch<SinglePostResponse>(`/posts/${postId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      invalidateAllPostLists(queryClient);
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/posts/${postId}`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function usePinPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.post(`/posts/${postId}/pin`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useUnpinPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/posts/${postId}/pin`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useBookmarkPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.post(`/posts/${postId}/bookmark`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useUnbookmarkPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/posts/${postId}/bookmark`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, emoji }: { postId: string; emoji?: string }) => apiClient.post(`/posts/${postId}/like`, { emoji }),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/posts/${postId}/like`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

interface PostLiker {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  emoji: string;
}

interface PaginatedLikersResponse {
  success: true;
  data: { items: PostLiker[]; nextCursor: string | null };
}

export function usePostLikers(postId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["post-likers", postId],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedLikersResponse>(`/posts/${postId}/likes`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!postId,
  });
}

export function useRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, input }: { postId: string; input?: RepostInput }) =>
      apiClient.post<SinglePostResponse>(`/posts/${postId}/repost`, input),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useUndoRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/posts/${postId}/repost`),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}

export function useVoteOnPoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      apiClient.post(`/posts/polls/${pollId}/vote`, { optionId }),
    onSuccess: () => invalidateAllPostLists(queryClient),
  });
}
