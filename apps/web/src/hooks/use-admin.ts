import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AdminDashboardStats,
  AdminUserRow,
  AdminReportRow,
  ResolveReportInput,
} from "@connecthub/shared-types";

interface StatsResponse {
  success: true;
  data: AdminDashboardStats;
}
interface PaginatedUsersResponse {
  success: true;
  data: { items: AdminUserRow[]; nextCursor: string | null };
}
interface PaginatedReportsResponse {
  success: true;
  data: { items: AdminReportRow[]; nextCursor: string | null };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiClient.get<StatsResponse>("/admin/stats"),
    select: (res) => res.data,
  });
}

export function useAdminUsers(q: string, filter: "all" | "banned" | "admin" | "verified") {
  return useInfiniteQuery({
    queryKey: ["admin", "users", q, filter],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedUsersResponse>("/admin/users", { params: { q: q || undefined, filter, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiClient.post(`/admin/users/${userId}/ban`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`/admin/users/${userId}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useSetVerified() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isVerified }: { userId: string; isVerified: boolean }) =>
      apiClient.patch(`/admin/users/${userId}/verified`, { isVerified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useAdminReports(status: string, targetType: string) {
  return useInfiniteQuery({
    queryKey: ["admin", "reports", status, targetType],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.get<PaginatedReportsResponse>("/admin/reports", { params: { status, targetType, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, input }: { reportId: string; input: ResolveReportInput }) =>
      apiClient.post(`/admin/reports/${reportId}/resolve`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => apiClient.delete(`/admin/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => apiClient.delete(`/admin/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
