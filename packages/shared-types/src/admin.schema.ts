import { z } from "zod";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), // search by username/email/fullName
  filter: z.enum(["all", "banned", "admin", "verified"]).default("all"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminReportListQuerySchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED", "ALL"]).default("PENDING"),
  targetType: z.enum(["POST", "COMMENT", "USER", "ALL"]).default("ALL"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const banUserSchema = z.object({
  reason: z.string().trim().min(1, "A ban reason is required").max(500),
});
export type BanUserInput = z.infer<typeof banUserSchema>;

export const setVerifiedSchema = z.object({
  isVerified: z.boolean(),
});
export type SetVerifiedInput = z.infer<typeof setVerifiedSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(["DISMISS", "REMOVE_CONTENT", "BAN_USER"]),
  note: z.string().trim().max(500).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Row shape for the admin user-management table — richer than the public UserSummary. */
export const adminUserRowSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isVerified: z.boolean(),
  isAdmin: z.boolean(),
  isBanned: z.boolean(),
  banReason: z.string().nullable(),
  isEmailVerified: z.boolean(),
  createdAt: z.string(),
  postsCount: z.number(),
  followersCount: z.number(),
});
export type AdminUserRow = z.infer<typeof adminUserRowSchema>;

/** A report plus enough context about the reported content/user to moderate it without extra clicks. */
export const adminReportRowSchema = z.object({
  id: z.string().uuid(),
  targetType: z.enum(["POST", "COMMENT", "USER"]),
  targetId: z.string(),
  reason: z.string(),
  status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  actionTaken: z.string().nullable(),
  reviewNote: z.string().nullable(),
  reporter: z.object({ id: z.string().uuid(), username: z.string(), avatarUrl: z.string().nullable() }),
  reviewer: z.object({ id: z.string().uuid(), username: z.string() }).nullable(),
  // Best-effort preview of what's being reported — null if the content was already deleted.
  targetPreview: z.object({
    label: z.string(), // e.g. the post's content snippet, comment text, or reported user's @handle
    authorUsername: z.string().nullable(),
    deleted: z.boolean(),
  }),
});
export type AdminReportRow = z.infer<typeof adminReportRowSchema>;

export const adminDashboardStatsSchema = z.object({
  totals: z.object({
    users: z.number(),
    posts: z.number(),
    comments: z.number(),
    pendingReports: z.number(),
  }),
  newUsersLast7Days: z.number(),
  newPostsLast7Days: z.number(),
  signupsByDay: z.array(z.object({ date: z.string(), count: z.number() })),
  postsByDay: z.array(z.object({ date: z.string(), count: z.number() })),
  trendingHashtags: z.array(z.object({ tag: z.string(), postsCount: z.number() })),
  topPosts: z.array(
    z.object({
      id: z.string().uuid(),
      content: z.string().nullable(),
      authorUsername: z.string(),
      likesCount: z.number(),
      commentsCount: z.number(),
      createdAt: z.string(),
    })
  ),
});
export type AdminDashboardStats = z.infer<typeof adminDashboardStatsSchema>;
