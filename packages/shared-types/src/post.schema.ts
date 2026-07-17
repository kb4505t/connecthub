import { z } from "zod";
import { userSummarySchema } from "./user.schema";

export const postVisibilitySchema = z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]);

export const createPostSchema = z
  .object({
    content: z.string().max(10000, "Post is too long").optional(),
    visibility: postVisibilitySchema.default("PUBLIC"),
    scheduledFor: z.coerce.date().optional(),
    // Poll fields — all optional; if pollOptions is present, a poll is created alongside the post.
    pollOptions: z.array(z.string().min(1).max(80)).min(2).max(4).optional(),
    pollDurationHours: z.coerce.number().int().min(1).max(168).default(24).optional(),
  })
  .refine((data) => !data.scheduledFor || data.scheduledFor.getTime() > Date.now(), {
    message: "Scheduled time must be in the future",
    path: ["scheduledFor"],
  });
// Note: "must have content, media, or a poll" is intentionally NOT enforced here —
// uploaded files live in req.files, not req.body, so Zod can't see them. That
// check happens in post.service.ts's createPost, which has all three inputs.
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  content: z.string().max(10000).optional(),
  visibility: postVisibilitySchema.optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum(["following", "latest", "trending"]).default("latest"),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const mediaSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["IMAGE", "VIDEO"]),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  duration: z.number().nullable(),
  order: z.number(),
});
export type MediaItem = z.infer<typeof mediaSchema>;

export const pollOptionResultSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  voteCount: z.number(),
});

export const postReactionSummarySchema = z.object({
  emoji: z.string(),
  count: z.number(),
});

export const pollSchema = z.object({
  id: z.string().uuid(),
  expiresAt: z.string(),
  options: z.array(pollOptionResultSchema),
  totalVotes: z.number(),
  viewerVoteOptionId: z.string().uuid().nullable(),
});
export type Poll = z.infer<typeof pollSchema>;

export const postSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    author: userSummarySchema,
    content: z.string().nullable(),
    visibility: postVisibilitySchema,
    isPinned: z.boolean(),
    isEdited: z.boolean(),
    createdAt: z.string(),
    publishedAt: z.string().nullable(),
    scheduledFor: z.string().nullable(),
    media: z.array(mediaSchema),
    poll: pollSchema.nullable(),
    originalPost: postSchema.nullable().optional(),
    reactions: z.array(postReactionSummarySchema),
    likesCount: z.number(),
    commentsCount: z.number(),
    repostsCount: z.number(),
    bookmarksCount: z.number(),
    viewerReaction: z.string().nullable(),
    isLiked: z.boolean(),
    isBookmarked: z.boolean(),
    isReposted: z.boolean(),
    isOwnPost: z.boolean(),
  })
);
export type PostDTO = {
  id: string;
  author: z.infer<typeof userSummarySchema>;
  content: string | null;
  visibility: z.infer<typeof postVisibilitySchema>;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  media: MediaItem[];
  poll: Poll | null;
  originalPost: PostDTO | null;
  reactions: { emoji: string; count: number }[];
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  bookmarksCount: number;
  viewerReaction: string | null;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
  isOwnPost: boolean;
};

export const repostSchema = z.object({
  content: z.string().max(10000).optional(), // optional "quote" text alongside the repost
});
export type RepostInput = z.infer<typeof repostSchema>;

export const voteOnPollSchema = z.object({
  optionId: z.string().uuid(),
});
export type VoteOnPollInput = z.infer<typeof voteOnPollSchema>;

// Kept short and simple rather than validating against a fixed emoji allowlist —
// an allowlist would need constant maintenance as new emoji are released.
export const reactToPostSchema = z.object({
  emoji: z.string().min(1).max(8).default("❤️"),
});
export type ReactToPostInput = z.infer<typeof reactToPostSchema>;
