import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../utils/password";

describe("password utils", () => {
  it("hashes a password to a bcrypt string different from the original", async () => {
    const hash = await hashPassword("SuperSecret123");
    expect(hash).not.toBe("SuperSecret123");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt hash prefix
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("SuperSecret123");
    await expect(comparePassword("SuperSecret123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("SuperSecret123");
    await expect(comparePassword("WrongPassword", hash)).resolves.toBe(false);
  });
});
