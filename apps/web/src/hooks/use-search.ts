import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SearchUserResult, HashtagResult, PostDTO } from "@connecthub/shared-types";

interface PreviewResponse {
  success: true;
  data: { users: SearchUserResult[]; posts: PostDTO[]; hashtags: HashtagResult[] };
}

interface PaginatedUsersResponse {
  success: true;
  data: { items: SearchUserResult[]; nextCursor: string | null };
}

interface PaginatedPostsResponse {
  success: true;
  data: { items: PostDTO[]; nextCursor: string | null };
}

interface PaginatedHashtagsResponse {
  success: true;
  data: { items: HashtagResult[]; nextCursor: string | null };
}

/** Combined, un-paginated preview backing the navbar typeahead dropdown. */
export function useSearchPreview(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", "preview", trimmed],
    queryFn: () => apiClient.get<PreviewResponse>("/search", { params: { q: trimmed } }),
    select: (res) => res.data,
    enabled: trimmed.length > 0,
  });
}

export function useSearchUsers(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["search", "users", trimmed],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedUsersResponse>("/search/users", { params: { q: trimmed, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: trimmed.length > 0,
  });
}

export function useSearchPosts(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["search", "posts", trimmed],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedPostsResponse>("/search/posts", { params: { q: trimmed, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: trimmed.length > 0,
  });
}

export function useSearchHashtags(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["search", "hashtags", trimmed],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedHashtagsResponse>("/search/hashtags", { params: { q: trimmed, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: trimmed.length > 0,
  });
}

export function usePostsByHashtag(tag: string) {
  return useInfiniteQuery({
    queryKey: ["hashtag-posts", tag],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedPostsResponse>(`/posts/hashtag/${encodeURIComponent(tag)}`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!tag,
  });
}
