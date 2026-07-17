import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE_NAME = "connecthub_refresh_token";
const AUTH_ONLY_ROUTES = ["/login", "/register", "/forgot-password"]; // redirect away from these if already logged in

/**
 * Lightweight, edge-run route guard based on the presence of the httpOnly
 * refresh-token cookie. This is a UX optimization only (avoids a flash of
 * the login form for an already-logged-in user, or vice versa) — it is NOT
 * the security boundary. The API's `authenticate` middleware, which
 * verifies the JWT signature, is the actual authorization check. A present
 * cookie here doesn't guarantee a still-valid session; the client-side
 * refresh call handles that.
 *
 * Production note: this only works when the cookie is visible to this
 * middleware — true when web+api share a root domain or sit behind one
 * proxy. If deploying frontend and backend on separate domains (e.g.
 * Vercel + Render, no proxy), this middleware won't see the cookie; rely
 * on AuthInitializer's client-side redirect instead, or proxy /api/*
 * through the frontend domain.
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(REFRESH_COOKIE_NAME);
  const { pathname } = req.nextUrl;

  if (hasSession && AUTH_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/forgot-password"],
};
