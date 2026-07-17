import { useAuthStore } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  /** Internal flag to prevent infinite refresh loops */
  _retried?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, _retried, ...init } = options;

  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const accessToken = useAuthStore.getState().accessToken;

  const res = await fetch(url.toString(), {
    ...init,
    credentials: "include", // send the httpOnly refresh-token cookie
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.message ?? "Request failed", res.status, data?.details);
  }

  return data as T;
}

/**
 * Thin fetch wrapper shared by every feature's hooks (usePosts, useProfile...).
 * On a 401 (expired access token), transparently calls /auth/refresh once
 * using the httpOnly cookie, stores the new access token, and retries the
 * original request — so components never have to think about token expiry.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const is401 = err instanceof ApiError && err.status === 401;
    const isAuthRoute = path.startsWith("/auth/");

    if (is401 && !isAuthRoute && !options._retried) {
      try {
        const refreshed = await rawRequest<{ data: { accessToken: string } }>("/auth/refresh", { method: "POST" });
        useAuthStore.getState().setAccessToken(refreshed.data.accessToken);
        return await rawRequest<T>(path, { ...options, _retried: true });
      } catch {
        useAuthStore.getState().clearAuth();
        throw err;
      }
    }

    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};
