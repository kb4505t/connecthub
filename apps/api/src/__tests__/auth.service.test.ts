import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma and the email service before importing the service under test,
// so no real database or network call ever happens in this test file.
vi.mock("../config/db", () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    emailVerificationToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    passwordResetToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));
vi.mock("../utils/email", () => ({
  emailService: { sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() },
}));

import { prisma } from "../config/db";
import { emailService } from "../utils/email";
import { authService } from "../services/auth.service";
import { AppError } from "../utils/AppError";

const mockReq = { headers: {}, ip: "127.0.0.1" } as unknown as import("express").Request;

describe("authService.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects registration when the email is already taken", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ email: "taken@test.com", username: "other" });

    await expect(
      authService.register({ email: "taken@test.com", username: "newuser", password: "Password1" }, mockReq)
    ).rejects.toThrow(AppError);
  });

  it("creates a user, sends a verification email, and issues a session on success", async () => {
    (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "new@test.com",
      username: "newuser",
      fullName: null,
      avatarUrl: null,
      isEmailVerified: false,
      isAdmin: false,
    });
    (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "token-1" });
    (prisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.emailVerificationToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await authService.register(
      { email: "new@test.com", username: "newuser", password: "Password1" },
      mockReq
    );

    expect(result.user.email).toBe("new@test.com");
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith("new@test.com", expect.any(String));
  });
});

describe("authService.forgotPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not throw or reveal whether the email exists", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(authService.forgotPassword("nobody@test.com")).resolves.toBeUndefined();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email when the user exists", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1", email: "real@test.com" });
    (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await authService.forgotPassword("real@test.com");
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith("real@test.com", expect.any(String));
  });
});
