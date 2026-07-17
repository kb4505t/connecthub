import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { UserProfile, UserSummary, UpdateProfileInput } from "@connecthub/shared-types";

interface ProfileResponse {
  success: true;
  data: { profile: UserProfile };
}

interface PaginatedUsersResponse {
  success: true;
  data: { items: UserSummary[]; nextCursor: string | null };
}

export function useProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["profile", username],
    queryFn: () => apiClient.get<ProfileResponse>(`/users/${username}`),
    enabled: !!username,
    select: (res) => res.data.profile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => apiClient.patch<ProfileResponse>("/users/me", input),
    onSuccess: (res) => {
      queryClient.setQueryData(["profile", res.data.profile.username], res);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isPrivate: boolean) => apiClient.patch("/users/me/privacy", { isPrivate }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

async function uploadImage(path: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}${path}`, {
    method: "POST",
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData, // no Content-Type header — the browser sets the multipart boundary itself
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Upload failed");
  return data;
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (file: File) => uploadImage("/users/me/avatar", file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      if (user) queryClient.invalidateQueries({ queryKey: ["profile", user.username] });
    },
  });
}

export function useUploadCoverImage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (file: File) => uploadImage("/users/me/cover", file),
    onSuccess: () => {
      if (user) queryClient.invalidateQueries({ queryKey: ["profile", user.username] });
    },
  });
}

export function useFollowUser(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/users/${username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      queryClient.invalidateQueries({ queryKey: ["search"] }); // search results embed isFollowedByViewer too
    },
  });
}

export function useUnfollowUser(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/users/${username}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", username] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useFollowers(username: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["followers", username],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedUsersResponse>(`/users/${username}/followers`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!username,
  });
}

export function useFollowing(username: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["following", username],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedUsersResponse>(`/users/${username}/following`, { params: { cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: !!username,
  });
}
