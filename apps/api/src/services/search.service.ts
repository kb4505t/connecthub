import { prisma } from "../config/db";
import { paginate } from "../utils/pagination";
import { userService } from "./user.service";
import { postService } from "./post.service";

const PREVIEW_LIMIT = 5;

export const searchService = {
  /**
   * Hashtag search, ranked by usage rather than alphabetically — "which tag
   * did they mean" is usually answered by "the popular one," same reasoning
   * as the Phase 5 trending feed. That ranking can't be expressed as a
   * stable id-cursor (ties on postsCount aren't ordered by id), so this
   * uses the same offset-as-cursor pattern the trending feed already
   * established rather than inventing a second pagination convention.
   */
  async searchHashtags(query: string, cursor: string | undefined, limit: number) {
    const normalizedQuery = query.toLowerCase().replace(/^#/, "");
    const offset = cursor ? parseInt(cursor, 10) || 0 : 0;

    const rows = await prisma.hashtag.findMany({
      where: { tag: { contains: normalizedQuery, mode: "insensitive" } },
      include: { _count: { select: { posts: true } } },
      orderBy: [{ posts: { _count: "desc" } }, { tag: "asc" }],
      take: limit + 1,
      skip: offset,
    });

    const { items, nextCursor: hasMore } = paginate(rows, limit);
    return {
      items: items.map((h) => ({ tag: h.tag, postsCount: h._count.posts })),
      nextCursor: hasMore ? String(offset + limit) : null,
    };
  },

  /**
   * The combined, un-paginated preview shown in a typeahead dropdown as
   * someone types — top few of each type, fetched in parallel. Each type's
   * own dedicated, fully-paginated endpoint (searchUsers/searchPosts/
   * searchHashtags above) is what backs the actual "see all results" tabs;
   * this just answers "is it even worth opening the full results page."
   */
  async searchPreview(viewerId: string | undefined, query: string) {
    const [users, posts, hashtags] = await Promise.all([
      userService.searchUsers(viewerId, query, undefined, PREVIEW_LIMIT),
      postService.searchPosts(viewerId, query, undefined, PREVIEW_LIMIT),
      searchService.searchHashtags(query, undefined, PREVIEW_LIMIT),
    ]);

    return { users: users.items, posts: posts.items, hashtags: hashtags.items };
  },
};
