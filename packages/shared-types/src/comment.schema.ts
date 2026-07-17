import { z } from "zod";
import { userSummarySchema } from "./user.schema";

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment can't be empty").max(2000, "Comment is too long"),
  parentId: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment can't be empty").max(2000, "Comment is too long"),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// Kept short and simple rather than validating against a fixed emoji allowlist —
// an allowlist would need constant maintenance as new emoji are released.
export const reactToCommentSchema = z.object({
  emoji: z.string().min(1).max(8),
});
export type ReactToCommentInput = z.infer<typeof reactToCommentSchema>;

export const reactionSummarySchema = z.object({
  emoji: z.string(),
  count: z.number(),
});

export const commentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  author: userSummarySchema,
  content: z.string(),
  isEdited: z.boolean(),
  createdAt: z.string(),
  repliesCount: z.number(),
  reactions: z.array(reactionSummarySchema),
  totalReactionsCount: z.number(),
  viewerReaction: z.string().nullable(),
  isOwnComment: z.boolean(),
});
export type CommentDTO = z.infer<typeof commentSchema>;
