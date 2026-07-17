import { z } from "zod";
import { userSummarySchema } from "./user.schema";

// Mirrors the Prisma `NotificationType` enum (schema.prisma) — kept in sync by hand
// since Prisma's generated enum isn't importable from this package without pulling
// in @prisma/client as a dependency here too.
export const notificationTypeSchema = z.enum(["LIKE", "COMMENT", "MENTION", "FOLLOW", "MESSAGE", "REPOST"]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: notificationTypeSchema,
  actor: userSummarySchema, // who triggered it — never the recipient, self-notifications are never created
  postId: z.string().uuid().nullable(),
  commentId: z.string().uuid().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type NotificationDTO = z.infer<typeof notificationSchema>;
