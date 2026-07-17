import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

/**
 * Protects routes by requiring a valid `Authorization: Bearer <accessToken>`
 * header. On success, attaches `req.user = { id }` for downstream handlers.
 * Does NOT hit the database — access tokens are short-lived (15m) by design,
 * so we trust the JWT signature rather than paying a DB round trip on every
 * authenticated request. Ban/deletion checks happen at the service layer
 * for actions that matter (e.g. posting), not on every read.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Authentication required");
  }

  const token = header.slice("Bearer ".length);
  const payload = verifyAccessToken(token);

  req.user = { id: payload.userId };
  next();
}

/** Like `authenticate`, but doesn't throw if no token is present — for routes that behave differently for logged-in vs anonymous users. */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.user = { id: payload.userId };
    } catch {
      // invalid/expired token on an optional route — just proceed unauthenticated
    }
  }

  next();
}
