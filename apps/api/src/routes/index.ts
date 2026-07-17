import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";
import { postRouter } from "./post.routes";
import { commentRouter } from "./comment.routes";
import { notificationRouter } from "./notification.routes";
import { messageRouter } from "./message.routes";
import { storyRouter } from "./story.routes";
import { searchRouter } from "./search.routes";
import { adminRouter } from "./admin.routes";

/**
 * Root router mounted at /api/v1.
 * Each feature phase adds its own router here, e.g.:
 *   import { authRouter } from "./auth.routes";
 *   apiRouter.use("/auth", authRouter);
 *
 * Keeping this file as the single mounting point means routes/index.ts
 * is a one-glance map of the entire API surface.
 */
export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "ConnectHub API v1",
    phase: "Phase 13 — Admin Dashboard",
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/posts", postRouter);
apiRouter.use("/comments", commentRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/conversations", messageRouter);
apiRouter.use("/stories", storyRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/admin", adminRouter);
