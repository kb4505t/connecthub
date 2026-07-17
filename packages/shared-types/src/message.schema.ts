import { z } from "zod";
import { userSummarySchema } from "./user.schema";

// Mirrors the Prisma `ConversationType` enum (schema.prisma).
export const conversationTypeSchema = z.enum(["DIRECT", "GROUP"]);
export type ConversationType = z.infer<typeof conversationTypeSchema>;

// Mirrors the Prisma `MediaType` enum — reused here so a message can carry
// either an image or a voice note without a third enum just for chat.
export const messageMediaTypeSchema = z.enum(["IMAGE", "VIDEO"]);
export type MessageMediaType = z.infer<typeof messageMediaTypeSchema>;

export const startDirectConversationSchema = z.object({
  username: z.string().min(1, "Username is required"),
});
export type StartDirectConversationInput = z.infer<typeof startDirectConversationSchema>;

export const createGroupConversationSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  usernames: z
    .array(z.string().min(1))
    .min(2, "A group needs at least 2 other members")
    .max(49, "Groups are limited to 50 members"),
});
export type CreateGroupConversationInput = z.infer<typeof createGroupConversationSchema>;

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const conversationParamsSchema = z.object({
  id: z.string().uuid("Invalid conversation id"),
});

export const messageParticipantSchema = userSummarySchema.extend({
  lastReadAt: z.string().nullable(),
});
export type MessageParticipant = z.infer<typeof messageParticipantSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  sender: userSummarySchema,
  content: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  mediaType: messageMediaTypeSchema.nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type MessageDTO = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.string().uuid(),
  type: conversationTypeSchema,
  name: z.string().nullable(),
  participants: z.array(messageParticipantSchema),
  lastMessage: messageSchema.nullable(),
  unreadCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});
export type ConversationDTO = z.infer<typeof conversationSchema>;
