import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { validate } from "../middlewares/validate";
import { optionalAuthenticate } from "../middlewares/authenticate";
import { asyncHandler } from "../middlewares/errorHandler";
import { searchQuerySchema } from "@connecthub/shared-types";

export const searchRouter = Router();

// optionalAuthenticate (not authenticate) — search works for anonymous
// visitors too, same as post visibility elsewhere; a logged-in viewer just
// gets isFollowedByViewer filled in and their private/followers-only posts
// included where they'd normally be visible.
searchRouter.use(optionalAuthenticate);

searchRouter.get("/", validate({ query: searchQuerySchema }), asyncHandler(searchController.preview));
searchRouter.get("/users", validate({ query: searchQuerySchema }), asyncHandler(searchController.users));
searchRouter.get("/posts", validate({ query: searchQuerySchema }), asyncHandler(searchController.posts));
searchRouter.get("/hashtags", validate({ query: searchQuerySchema }), asyncHandler(searchController.hashtags));
