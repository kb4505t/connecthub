import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { commentController } from "../controllers/comment.controller";
import { validate } from "../middlewares/validate";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { postMediaUpload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/errorHandler";
import {
  createPostSchema,
  updatePostSchema,
  feedQuerySchema,
  paginationQuerySchema,
  repostSchema,
  voteOnPollSchema,
  createCommentSchema,
  reactToPostSchema,
} from "@connecthub/shared-types";

export const postRouter = Router();

// Specific paths before "/:id" so they aren't swallowed by the generic param route
postRouter.get("/feed", optionalAuthenticate, validate({ query: feedQuerySchema }), asyncHandler(postController.getFeed));
postRouter.get("/bookmarks", authenticate, validate({ query: paginationQuerySchema }), asyncHandler(postController.getBookmarks));
postRouter.get(
  "/hashtag/:tag",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(postController.getByHashtag)
);
postRouter.post("/polls/:pollId/vote", authenticate, validate({ body: voteOnPollSchema }), asyncHandler(postController.voteOnPoll));

postRouter.post(
  "/",
  authenticate,
  postMediaUpload,
  validate({ body: createPostSchema }),
  asyncHandler(postController.create)
);

postRouter.get("/:id", optionalAuthenticate, asyncHandler(postController.getById));
postRouter.patch("/:id", authenticate, validate({ body: updatePostSchema }), asyncHandler(postController.update));
postRouter.delete("/:id", authenticate, asyncHandler(postController.remove));

postRouter.post("/:id/pin", authenticate, asyncHandler(postController.pin));
postRouter.delete("/:id/pin", authenticate, asyncHandler(postController.unpin));

postRouter.post("/:id/bookmark", authenticate, asyncHandler(postController.bookmark));
postRouter.delete("/:id/bookmark", authenticate, asyncHandler(postController.unbookmark));

postRouter.post("/:id/like", authenticate, validate({ body: reactToPostSchema }), asyncHandler(postController.like));
postRouter.delete("/:id/like", authenticate, asyncHandler(postController.unlike));
postRouter.get("/:id/likes", optionalAuthenticate, validate({ query: paginationQuerySchema }), asyncHandler(postController.getLikers));

postRouter.post("/:id/repost", authenticate, validate({ body: repostSchema }), asyncHandler(postController.repost));
postRouter.delete("/:id/repost", authenticate, asyncHandler(postController.undoRepost));

postRouter.get(
  "/:postId/comments",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(commentController.getForPost)
);
postRouter.post(
  "/:postId/comments",
  authenticate,
  validate({ body: createCommentSchema }),
  asyncHandler(commentController.create)
);
