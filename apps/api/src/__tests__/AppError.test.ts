import { describe, it, expect } from "vitest";
import { AppError } from "../utils/AppError";

describe("AppError", () => {
  it("badRequest produces a 400 with the given message", () => {
    const err = AppError.badRequest("Invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid input");
    expect(err.isOperational).toBe(true);
  });

  it("unauthorized defaults to a standard message", () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized");
  });

  it("notFound produces a 404", () => {
    expect(AppError.notFound("User not found").statusCode).toBe(404);
  });

  it("conflict produces a 409", () => {
    expect(AppError.conflict("Already exists").statusCode).toBe(409);
  });
});
