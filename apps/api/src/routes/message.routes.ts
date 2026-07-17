import { Router } from "express";
import { messageController } from "../controllers/message.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { messageMediaUpload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/errorHandler";
import {
  paginationQuerySchema,
  startDirectConversationSchema,
  createGroupConversationSchema,
  sendMessageSchema,
} from "@connecthub/shared-types";

export const messageRouter = Router();

// Every conversation and message is scoped to the caller — same as
// notifications, there's no anonymous or public read path here.
messageRouter.use(authenticate);

messageRouter.get("/", validate({ query: paginationQuerySchema }), asyncHandler(messageController.listConversations));
messageRouter.post("/direct", validate({ body: startDirectConversationSchema }), asyncHandler(messageController.startDirect));
messageRouter.post("/group", validate({ body: createGroupConversationSchema }), asyncHandler(messageController.createGroup));

messageRouter.get("/:id", asyncHandler(messageController.getConversation));
messageRouter.delete("/:id/leave", asyncHandler(messageController.leave));

messageRouter.get(
  "/:id/messages",
  validate({ query: paginationQuerySchema }),
  asyncHandler(messageController.getMessages)
);
messageRouter.post(
  "/:id/messages",
  validate({ body: sendMessageSchema }),
  asyncHandler(messageController.sendMessage)
);
messageRouter.post("/:id/messages/media", messageMediaUpload, asyncHandler(messageController.sendMediaMessage));

messageRouter.patch("/:id/read", asyncHandler(messageController.markRead));
