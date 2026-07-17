export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Standard cursor pagination pattern used across every list endpoint
 * (followers, feed, comments, messages...). Callers fetch `limit + 1` rows
 * ordered by `id` (or another unique, stable column) descending; if the
 * extra row exists, there's a next page and its id becomes the cursor.
 *
 * Using `id` (UUID) as a cursor instead of offset/page-number avoids the
 * classic "items shift as new rows are inserted" bug that page-number
 * pagination has on a live feed.
 */
export function paginate<T extends { id: string }>(rows: T[], limit: number): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, nextCursor };
}
