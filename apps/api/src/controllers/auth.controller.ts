import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const REFRESH_COOKIE_NAME = "connecthub_refresh_token";

const refreshCookieOptions = {
  httpOnly: true, // inaccessible to JS — the core XSS defense for this token
  secure: env.NODE_ENV === "production", // HTTPS-only in prod; allow http on localhost
  // Deployment note: the web app (Vercel) and API (Render) live on different
  // domains in production, which makes every request cross-site from the
  // browser's point of view. `Lax` cookies are withheld from cross-site
  // fetch()/XHR — only sent on top-level navigations — so a Lax refresh
  // cookie here would silently break `/auth/refresh` in production while
  // working fine in local dev (where both run on localhost, same-site).
  // `None` is required to send the cookie cross-site, and only works
  // alongside `secure: true`, which is already the case in production.
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/api/v1/auth", // only sent to auth endpoints, not the whole API surface
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d, matches JWT_REFRESH_EXPIRES_IN default
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, req);
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json({
      success: true,
      message: "Account created. Check your email to verify your address.",
      data: { user: result.user, accessToken: result.accessToken },
    });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, req);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: { user: result.user, accessToken: result.accessToken },
    });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw AppError.unauthorized("No active session");

    const result = await authService.refresh(token);
    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({
      success: true,
      data: { user: result.user, accessToken: result.accessToken },
    });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(token);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, message: "Logged out" });
  },

  async logoutAll(req: Request, res: Response) {
    await authService.logoutAll(req.user!.id);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, message: "Logged out of all devices" });
  },

  async verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(req.body.token);
    res.status(200).json({ success: true, message: "Email verified successfully" });
  },

  async resendVerification(req: Request, res: Response) {
    await authService.resendVerificationEmail(req.user!.id);
    res.status(200).json({ success: true, message: "Verification email sent" });
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ success: true, message: "Password reset successfully. Please log in again." });
  },

  async me(req: Request, res: Response) {
    const user = await authService.getCurrentUser(req.user!.id);
    res.status(200).json({ success: true, data: { user } });
  },
};
