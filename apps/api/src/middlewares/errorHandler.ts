import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { env } from "../config/env";

/**
 * Wraps async route handlers so thrown/rejected errors are forwarded to
 * Express's error pipeline instead of crashing the process or hanging.
 * Usage: router.get("/x", asyncHandler(controller.getX))
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Single place where every error in the app ends up. Keeps controllers
 * free of try/catch boilerplate and guarantees a consistent JSON shape
 * for every error response the client ever sees.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Known, expected errors we threw ourselves
  if (err instanceof AppError) {
    if (!err.isOperational) logger.error(err.stack);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }

  // Request validation errors (Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  }

  // File upload errors (wrong size/field name, etc.)
  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    return res.status(400).json({ success: false, message });
  }

  // Known Prisma errors (unique constraint, FK violation, record not found...)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: `A record with this ${(err.meta?.target as string[])?.join(", ") ?? "value"} already exists`,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    logger.error(`Prisma error [${err.code}]: ${err.message}`);
    return res.status(400).json({ success: false, message: "Database request error" });
  }

  // Anything else is unexpected — log full detail, never leak internals to client
  logger.error(err instanceof Error ? err.stack : String(err));
  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
    ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
}
