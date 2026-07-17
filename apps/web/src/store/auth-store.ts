import { create } from "zustand";
import type { AuthUser } from "@connecthub/shared-types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isInitializing: boolean; // true until the first /me or /refresh check resolves on app load
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  setInitializing: (value: boolean) => void;
}

/**
 * Deliberately in-memory only (zustand, no persist middleware, no localStorage).
 * The access token is short-lived and reconstructible via the httpOnly refresh
 * cookie on page load (see lib/auth-init.ts), so nothing sensitive needs to
 * survive a hard refresh in client-readable storage — the standard defense
 * against XSS-based token theft.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitializing: true,
  setAuth: (user, accessToken) => set({ user, accessToken, isInitializing: false }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null, isInitializing: false }),
  setInitializing: (value) => set({ isInitializing: value }),
}));
