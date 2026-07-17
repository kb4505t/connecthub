import { z } from "zod";
import { userSummarySchema } from "./user.schema";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query can't be empty").max(100),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

/**
 * Search-result user shape — the usual summary plus a bio snippet and
 * follow state. Search is often the first time a viewer sees this person,
 * so the bio (to tell two "Alex Kim"s apart) and a Follow button both earn
 * their place here in a way they don't on, say, a comment author.
 */
export const searchUserResultSchema = userSummarySchema.extend({
  bio: z.string().nullable(),
  isFollowedByViewer: z.boolean(),
});
export type SearchUserResult = z.infer<typeof searchUserResultSchema>;

export const hashtagResultSchema = z.object({
  tag: z.string(),
  postsCount: z.number(),
});
export type HashtagResult = z.infer<typeof hashtagResultSchema>;
