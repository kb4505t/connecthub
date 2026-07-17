import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

/**
 * Gates the entire /admin router. Must run AFTER `authenticate`.
 *
 * Unlike `authenticate` (which trusts the JWT signature alone, by design, to
 * avoid a DB hit on every request), admin actions are sensitive enough — and
 * infrequent enough — that we pay for a fresh `isAdmin`/`isBanned` lookup
 * every time. This closes the gap where a user promoted/demoted or banned
 * after their access token was issued would otherwise keep admin access for
 * up to the token's remaining 15-minute lifetime.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw AppError.unauthorized("Authentication required");

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { isAdmin: true, isBanned: true },
  });

  if (!user || !user.isAdmin || user.isBanned) {
    throw AppError.forbidden("Admin access required");
  }

  next();
}
