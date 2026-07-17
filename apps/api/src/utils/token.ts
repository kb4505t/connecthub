import crypto from "crypto";

/** Generates a URL-safe random token for email verification / password reset links. */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
