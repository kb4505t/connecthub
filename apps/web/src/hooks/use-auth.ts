import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type {
  AuthUser,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@connecthub/shared-types";

interface AuthResponse {
  success: true;
  message: string;
  data: { user: AuthUser; accessToken: string };
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (input: RegisterInput) => apiClient.post<AuthResponse>("/auth/register", input),
    onSuccess: (res) => setAuth(res.data.user, res.data.accessToken),
  });
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (input: LoginInput) => apiClient.post<AuthResponse>("/auth/login", input),
    onSuccess: (res) => setAuth(res.data.user, res.data.accessToken),
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/auth/logout"),
    onSettled: () => {
      // Clear regardless of API success — the user's intent is to be logged
      // out locally even if the network call fails.
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => apiClient.post<{ message: string }>("/auth/forgot-password", input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => apiClient.post<{ message: string }>("/auth/reset-password", input),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => apiClient.post<{ message: string }>("/auth/verify-email", { token }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiClient.post<{ message: string }>("/auth/resend-verification"),
  });
}

/**
 * Fetches the current user. Used both to hydrate the auth store on app load
 * (see AuthInitializer) and by any component that just needs `useMe().data`.
 */
export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<{ data: { user: AuthUser } }>("/auth/me"),
    enabled: !!accessToken,
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 1,
    select: (res) => res.data.user,
  });
}
