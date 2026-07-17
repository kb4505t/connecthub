import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { asyncHandler } from "../middlewares/errorHandler";
import { paginationQuerySchema } from "@connecthub/shared-types";

export const notificationRouter = Router();

// Every notification is scoped to the caller — there's no anonymous or
// public read path here, unlike posts/profiles.
notificationRouter.use(authenticate);

notificationRouter.get("/", validate({ query: paginationQuerySchema }), asyncHandler(notificationController.list));
notificationRouter.get("/unread-count", asyncHandler(notificationController.unreadCount));
notificationRouter.patch("/read-all", asyncHandler(notificationController.markAllRead));
notificationRouter.patch("/:id/read", asyncHandler(notificationController.markRead));
