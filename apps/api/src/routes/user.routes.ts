import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { postController } from "../controllers/post.controller";
import { validate } from "../middlewares/validate";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { imageUpload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/errorHandler";
import { updateProfileSchema, updatePrivacySchema, paginationQuerySchema } from "@connecthub/shared-types";

export const userRouter = Router();

// Uploads/removals — specific paths before the generic "/:username" so they don't get swallowed by it
userRouter.post("/me/avatar", authenticate, imageUpload.single("image"), asyncHandler(userController.uploadAvatar));
userRouter.delete("/me/avatar", authenticate, asyncHandler(userController.removeAvatar));
userRouter.post("/me/cover", authenticate, imageUpload.single("image"), asyncHandler(userController.uploadCoverImage));
userRouter.delete("/me/cover", authenticate, asyncHandler(userController.removeCoverImage));

userRouter.patch("/me", authenticate, validate({ body: updateProfileSchema }), asyncHandler(userController.updateProfile));
userRouter.patch(
  "/me/privacy",
  authenticate,
  validate({ body: updatePrivacySchema }),
  asyncHandler(userController.updatePrivacy)
);

// Public profile + follow graph — optionalAuthenticate so isFollowing/isOwnProfile
// resolve correctly for logged-in viewers, but anonymous viewers can still read profiles
userRouter.get("/:username", optionalAuthenticate, asyncHandler(userController.getProfile));
userRouter.get(
  "/:username/followers",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(userController.listFollowers)
);
userRouter.get(
  "/:username/following",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(userController.listFollowing)
);
userRouter.get(
  "/:username/posts",
  optionalAuthenticate,
  validate({ query: paginationQuerySchema }),
  asyncHandler(postController.getByUsername)
);

userRouter.post("/:username/follow", authenticate, asyncHandler(userController.follow));
userRouter.delete("/:username/follow", authenticate, asyncHandler(userController.unfollow));
