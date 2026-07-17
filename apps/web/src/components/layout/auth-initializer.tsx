"use client";

import * as React from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { AuthUser } from "@connecthub/shared-types";

interface RefreshResponse {
  success: true;
  data: { user: AuthUser; accessToken: string };
}

/**
 * On first mount, tries to silently re-establish a session using the
 * httpOnly refresh cookie (the access token itself only ever lives in
 * memory, so it's gone after a hard refresh). If it succeeds, the auth
 * store is hydrated before the rest of the app renders its authed state;
 * if it fails (no cookie / expired), the user is simply treated as logged out.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  React.useEffect(() => {
    let cancelled = false;

    apiClient
      .post<RefreshResponse>("/auth/refresh")
      .then((res) => {
        if (!cancelled) setAuth(res.data.user, res.data.accessToken);
      })
      .catch((err) => {
        if (!cancelled) {
          if (!(err instanceof ApiError && err.status === 401)) {
            console.error("Session restore failed:", err);
          }
          clearAuth();
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
