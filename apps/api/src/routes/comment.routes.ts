import { Router } from "express";
import { commentController } from "../controllers/comment.controller";
import { validate } from "../middlewares/validate";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { asyncHandler } from "../middlewares/errorHandler";
import { updateCommentSchema, reactToCommentSchema, paginationQuerySchema } from "@connecthub/shared-types";

export const commentRouter = Router();

commentRouter.get(
  "/:id/replies",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(commentController.getReplies)
);
commentRouter.patch("/:id", authenticate, validate({ body: updateCommentSchema }), asyncHandler(commentController.update));
commentRouter.delete("/:id", authenticate, asyncHandler(commentController.remove));
commentRouter.post("/:id/react", authenticate, validate({ body: reactToCommentSchema }), asyncHandler(commentController.react));
commentRouter.delete("/:id/react", authenticate, asyncHandler(commentController.removeReaction));
