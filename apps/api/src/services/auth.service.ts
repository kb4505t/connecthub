import { Request } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { hashPassword, comparePassword } from "../utils/password";
import { generateSecureToken } from "../utils/token";
import { signAccessToken, signRefreshToken, verifyRefreshToken, expiresInToDate } from "../utils/jwt";
import { emailService } from "../utils/email";
import { env } from "../config/env";
import type { RegisterInput, LoginInput } from "@connecthub/shared-types";

const EMAIL_VERIFICATION_TTL = "24h";
const PASSWORD_RESET_TTL = "1h";

/** Fields safe to return to the client — never includes passwordHash. */
function toPublicUser(user: {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isAdmin: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    isAdmin: user.isAdmin,
  };
}

async function issueSession(userId: string, req: Request) {
  // Create the DB row first so we have a tokenId to embed in the JWT —
  // this is what makes individual-session revocation possible later.
  const refreshTokenRow = await prisma.refreshToken.create({
    data: {
      token: "", // placeholder, updated right after signing below
      userId,
      expiresAt: expiresInToDate(env.JWT_REFRESH_EXPIRES_IN),
      userAgent: req.headers["user-agent"] ?? undefined,
      ipAddress: req.ip,
    },
  });

  const refreshToken = signRefreshToken({ userId, tokenId: refreshTokenRow.id });
  await prisma.refreshToken.update({ where: { id: refreshTokenRow.id }, data: { token: refreshToken } });

  const accessToken = signAccessToken({ userId });
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput, req: Request) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });
    if (existing) {
      throw AppError.conflict(
        existing.email === input.email ? "An account with this email already exists" : "This username is already taken"
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        fullName: input.fullName,
        passwordHash,
      },
    });

    // Fire off verification email (don't block registration response on email latency issues)
    const token = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: { token, userId: user.id, expiresAt: expiresInToDate(EMAIL_VERIFICATION_TTL) },
    });
    await emailService.sendVerificationEmail(user.email, token);

    const session = await issueSession(user.id, req);
    return { user: toPublicUser(user), ...session };
  },

  async login(input: LoginInput, req: Request) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: input.identifier }, { username: input.identifier }] },
    });

    // Same error for "no such user" and "wrong password" — prevents account enumeration
    if (!user || !(await comparePassword(input.password, user.passwordHash))) {
      throw AppError.unauthorized("Invalid email/username or password");
    }

    if (user.isBanned) {
      throw AppError.forbidden("This account has been suspended");
    }

    const session = await issueSession(user.id, req);
    return { user: toPublicUser(user), ...session };
  },

  async refresh(refreshTokenValue: string) {
    const payload = verifyRefreshToken(refreshTokenValue);

    const tokenRow = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    if (!tokenRow || tokenRow.revoked || tokenRow.token !== refreshTokenValue || tokenRow.expiresAt < new Date()) {
      throw AppError.unauthorized("Session expired, please log in again");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isBanned) {
      throw AppError.unauthorized("Session no longer valid");
    }

    // Rotate: revoke the old refresh token and issue a brand new one.
    // Limits the damage window if a refresh token is ever stolen.
    await prisma.refreshToken.update({ where: { id: tokenRow.id }, data: { revoked: true } });
    const newTokenRow = await prisma.refreshToken.create({
      data: {
        token: "",
        userId: user.id,
        expiresAt: expiresInToDate(env.JWT_REFRESH_EXPIRES_IN),
      },
    });
    const newRefreshToken = signRefreshToken({ userId: user.id, tokenId: newTokenRow.id });
    await prisma.refreshToken.update({ where: { id: newTokenRow.id }, data: { token: newRefreshToken } });

    const accessToken = signAccessToken({ userId: user.id });
    return { accessToken, refreshToken: newRefreshToken, user: toPublicUser(user) };
  },

  async logout(refreshTokenValue: string | undefined) {
    if (!refreshTokenValue) return;
    // Best-effort revoke; don't throw if the token is already gone/invalid —
    // logout should always succeed from the client's point of view.
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue },
      data: { revoked: true },
    });
  },

  /** Revokes every active session for a user — used by "log out of all devices". */
  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  },

  async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date()) {
      throw AppError.badRequest("Verification link is invalid or has expired");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);
  },

  async resendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");
    if (user.isEmailVerified) throw AppError.badRequest("Email is already verified");

    // Invalidate any previous tokens so only the newest link works
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const token = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt: expiresInToDate(EMAIL_VERIFICATION_TTL) },
    });
    await emailService.sendVerificationEmail(user.email, token);
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success even if no account exists — prevents attackers
    // from using this endpoint to discover which emails are registered.
    if (!user) return;

    await prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });

    const token = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: expiresInToDate(PASSWORD_RESET_TTL) },
    });
    await emailService.sendPasswordResetEmail(user.email, token);
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw AppError.badRequest("Reset link is invalid or has expired");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
      // Resetting the password invalidates every existing session — standard security practice
      prisma.refreshToken.updateMany({ where: { userId: record.userId, revoked: false }, data: { revoked: true } }),
    ]);
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound("User not found");
    return toPublicUser(user);
  },
};
