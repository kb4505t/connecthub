import { describe, it, expect } from "vitest";
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

describe("jwt utils", () => {
  it("signs and verifies an access token round-trip", () => {
    const token = signAccessToken({ userId: "user-123" });
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe("user-123");
  });

  it("signs and verifies a refresh token round-trip", () => {
    const token = signRefreshToken({ userId: "user-123", tokenId: "token-abc" });
    const payload = verifyRefreshToken(token);
    expect(payload.userId).toBe("user-123");
    expect(payload.tokenId).toBe("token-abc");
  });

  it("throws AppError for a malformed access token", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });
});
