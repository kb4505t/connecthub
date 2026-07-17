import { describe, it, expect } from "vitest";
import { durationToDate } from "../utils/date";

describe("durationToDate", () => {
  it("converts duration strings to future dates", () => {
    const now = Date.now();
    const result = durationToDate("15m");
    expect(result.getTime()).toBeGreaterThan(now);
    expect(result.getTime()).toBeLessThanOrEqual(now + 16 * 60 * 1000);
  });

  it("supports hour and day units", () => {
    const now = Date.now();
    expect(durationToDate("24h").getTime()).toBeGreaterThan(now + 23 * 60 * 60 * 1000);
    expect(durationToDate("7d").getTime()).toBeGreaterThan(now + 6 * 24 * 60 * 60 * 1000);
  });

  it("throws on an invalid format", () => {
    expect(() => durationToDate("banana")).toThrow();
  });
});
