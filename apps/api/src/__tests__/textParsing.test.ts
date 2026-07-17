import { describe, it, expect } from "vitest";
import { extractHashtags, extractMentionedUsernames } from "../utils/textParsing";

describe("extractHashtags", () => {
  it("extracts hashtags and lowercases them", () => {
    expect(extractHashtags("Loving #TypeScript and #NodeJS today")).toEqual(["typescript", "nodejs"]);
  });

  it("deduplicates repeated hashtags", () => {
    expect(extractHashtags("#react #react #react")).toEqual(["react"]);
  });

  it("returns an empty array when there are none", () => {
    expect(extractHashtags("just a regular post")).toEqual([]);
  });
});

describe("extractMentionedUsernames", () => {
  it("extracts @mentions and lowercases them", () => {
    expect(extractMentionedUsernames("Great work @JaneDoe and @john_smith!")).toEqual(["janedoe", "john_smith"]);
  });

  it("does not mistake an email address for a mention", () => {
    expect(extractMentionedUsernames("contact me at hello@example.com")).toEqual([]);
  });

  it("returns an empty array when there are none", () => {
    expect(extractMentionedUsernames("no mentions here")).toEqual([]);
  });
});
