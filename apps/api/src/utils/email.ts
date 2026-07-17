import { env } from "../config/env";
import { logger } from "../config/logger";

/**
 * Transactional email sender.
 *
 * No provider is wired in yet (Phase 1 brief doesn't specify one). If
 * RESEND_API_KEY is set, swap the body of `send()` for a real API call
 * (Resend, SendGrid, Postmark all have a near-identical fetch-based API).
 * Until then, emails are logged so the verification/reset flow is fully
 * testable locally without any external account.
 */
async function send(to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY) {
    logger.info(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}\n${html}`);
    return;
  }

  // Example real integration (uncomment once RESEND_API_KEY is set):
  // await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${env.RESEND_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  // });
}

export const emailService = {
  async sendVerificationEmail(to: string, token: string) {
    const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
    await send(
      to,
      "Verify your ConnectHub email",
      `<p>Welcome to ConnectHub! Confirm your email to activate your account:</p>
       <p><a href="${link}">${link}</a></p>
       <p>This link expires in 24 hours.</p>`
    );
  },

  async sendPasswordResetEmail(to: string, token: string) {
    const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await send(
      to,
      "Reset your ConnectHub password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${link}">${link}</a></p>
       <p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`
    );
  },
};
