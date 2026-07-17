import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { StoryDTO, StoryGroupDTO, StoryViewerDTO } from "@connecthub/shared-types";

interface StoryFeedResponse {
  success: true;
  data: { groups: StoryGroupDTO[] };
}

interface SingleStoryResponse {
  success: true;
  data: { story: StoryDTO };
}

interface PaginatedViewersResponse {
  success: true;
  data: { items: StoryViewerDTO[]; nextCursor: string | null };
}

export function useStoryFeed() {
  return useQuery({
    queryKey: ["stories", "feed"],
    queryFn: () => apiClient.get<StoryFeedResponse>("/stories/feed"),
    select: (res) => res.data.groups,
  });
}

export function useStoryViewers(storyId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["stories", storyId, "viewers"],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedViewersResponse>(`/stories/${storyId}/viewers`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!storyId,
  });
}

/** Uploads a single image or short video as a new 24h story. Multipart, like post/message media — see useCreatePost. */
export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const accessToken = useAuthStore.getState().accessToken;
      const res = await fetch(`${base}/stories`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? "Failed to post story");
      return data as SingleStoryResponse;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories", "feed"] }),
  });
}

/** Fire-and-forget: marks a story seen. Silently no-ops on failure (e.g. viewing your own) — nothing in the UI depends on this resolving. */
export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => apiClient.post(`/stories/${storyId}/view`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories", "feed"] }),
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => apiClient.delete(`/stories/${storyId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories", "feed"] }),
  });
}
