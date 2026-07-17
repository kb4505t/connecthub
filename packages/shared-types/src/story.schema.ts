import { z } from "zod";
import { userSummarySchema } from "./user.schema";

export const storyMediaTypeSchema = z.enum(["IMAGE", "VIDEO"]);
export type StoryMediaType = z.infer<typeof storyMediaTypeSchema>;

export const storySchema = z.object({
  id: z.string().uuid(),
  author: userSummarySchema,
  mediaUrl: z.string(),
  mediaType: storyMediaTypeSchema,
  createdAt: z.string(),
  expiresAt: z.string(),
  viewCount: z.number().int().nonnegative(),
  hasViewed: z.boolean(),
});
export type StoryDTO = z.infer<typeof storySchema>;

/** One "bubble" in the story bar — an author plus their still-active stories, oldest first (matches how they're viewed in sequence). */
export const storyGroupSchema = z.object({
  author: userSummarySchema,
  stories: z.array(storySchema),
  hasUnseen: z.boolean(),
});
export type StoryGroupDTO = z.infer<typeof storyGroupSchema>;

export const storyViewerSchema = z.object({
  viewer: userSummarySchema,
  viewedAt: z.string(),
});
export type StoryViewerDTO = z.infer<typeof storyViewerSchema>;
