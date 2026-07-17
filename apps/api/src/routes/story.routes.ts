import { Router } from "express";
import { storyController } from "../controllers/story.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { storyMediaUpload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/errorHandler";
import { paginationQuerySchema } from "@connecthub/shared-types";

export const storyRouter = Router();

// Every story route is authenticated — there's no logged-out story viewing, same as messages.
storyRouter.use(authenticate);

storyRouter.get("/feed", asyncHandler(storyController.getFeed));
storyRouter.post("/", storyMediaUpload, asyncHandler(storyController.create));

storyRouter.post("/:id/view", asyncHandler(storyController.recordView));
storyRouter.get("/:id/viewers", validate({ query: paginationQuerySchema }), asyncHandler(storyController.getViewers));
storyRouter.delete("/:id", asyncHandler(storyController.remove));
