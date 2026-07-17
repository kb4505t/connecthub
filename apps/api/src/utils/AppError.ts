/**
 * Base class for all expected/operational errors (bad input, not found,
 * unauthorized, etc). Controllers/services throw these; the global error
 * handler knows how to turn them into a clean JSON response.
 *
 * Anything that is NOT an AppError is treated as an unexpected bug and
 * logged with full detail rather than leaked to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new AppError(message, 401);
  }
  static forbidden(message = "Forbidden") {
    return new AppError(message, 403);
  }
  static notFound(message = "Resource not found") {
    return new AppError(message, 404);
  }
  static conflict(message: string) {
    return new AppError(message, 409);
  }
  static tooManyRequests(message = "Too many requests") {
    return new AppError(message, 429);
  }
  static internal(message = "Internal server error") {
    return new AppError(message, 500);
  }
}
