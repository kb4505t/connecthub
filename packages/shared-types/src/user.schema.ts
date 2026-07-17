import { z } from "zod";
import { usernameSchema } from "./auth.schema";

export const updateProfileSchema = z.object({
  fullName: z.string().max(100).optional(),
  bio: z.string().max(280, "Bio must be at most 280 characters").optional(),
  website: z.string().url("Enter a valid URL, e.g. https://example.com").or(z.literal("")).optional(),
  location: z.string().max(100).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateUsernameSchema = z.object({
  username: usernameSchema,
});
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>;

export const updatePrivacySchema = z.object({
  isPrivate: z.boolean(),
});
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Public-facing profile shape — what any viewer sees for a given username. */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  fullName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  isVerified: z.boolean(),
  isPrivate: z.boolean(),
  createdAt: z.string(),
  followersCount: z.number(),
  followingCount: z.number(),
  postsCount: z.number(),
  isFollowing: z.boolean(), // true if the current viewer follows this user
  isFollowedBy: z.boolean(), // true if this user follows the current viewer
  isOwnProfile: z.boolean(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const userSummarySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isVerified: z.boolean(),
});
export type UserSummary = z.infer<typeof userSummarySchema>;
