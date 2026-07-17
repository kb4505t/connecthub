import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/db", () => ({
  prisma: {
    hashtag: { findMany: vi.fn() },
  },
}));

vi.mock("../services/user.service", () => ({
  userService: { searchUsers: vi.fn() },
}));

vi.mock("../services/post.service", () => ({
  postService: { searchPosts: vi.fn() },
}));

import { prisma } from "../config/db";
import { userService } from "../services/user.service";
import { postService } from "../services/post.service";
import { searchService } from "../services/search.service";

describe("searchService.searchHashtags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("strips a leading # and lowercases the query before matching", async () => {
    (prisma.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await searchService.searchHashtags("#WorldNews", undefined, 20);

    expect(prisma.hashtag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tag: { contains: "worldnews", mode: "insensitive" } } })
    );
  });

  it("ranks by post count, offset-paginated like the trending feed", async () => {
    (prisma.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "hashtag-1", tag: "popular", _count: { posts: 42 } },
      { id: "hashtag-2", tag: "extra-row-signals-next-page", _count: { posts: 1 } },
    ]);

    const result = await searchService.searchHashtags("p", undefined, 1);

    expect(result.items).toEqual([{ tag: "popular", postsCount: 42 }]);
    expect(result.nextCursor).toBe("1"); // offset advances by `limit`
  });
});

describe("searchService.searchPreview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches all three result types in parallel and returns them together", async () => {
    (userService.searchUsers as ReturnType<typeof vi.fn>).mockResolvedValue({ items: ["user"], nextCursor: null });
    (postService.searchPosts as ReturnType<typeof vi.fn>).mockResolvedValue({ items: ["post"], nextCursor: null });
    (prisma.hashtag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ tag: "tag", _count: { posts: 1 } }]);

    const result = await searchService.searchPreview("viewer-1", "query");

    expect(userService.searchUsers).toHaveBeenCalledWith("viewer-1", "query", undefined, 5);
    expect(postService.searchPosts).toHaveBeenCalledWith("viewer-1", "query", undefined, 5);
    expect(result).toEqual({ users: ["user"], posts: ["post"], hashtags: [{ tag: "tag", postsCount: 1 }] });
  });
});
