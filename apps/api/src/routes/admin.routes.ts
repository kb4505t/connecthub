import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { requireAdmin } from "../middlewares/requireAdmin";
import { asyncHandler } from "../middlewares/errorHandler";
import {
  adminUserListQuerySchema,
  adminReportListQuerySchema,
  banUserSchema,
  setVerifiedSchema,
  resolveReportSchema,
} from "@connecthub/shared-types";

export const adminRouter = Router();

// Every route below requires a valid session AND a fresh isAdmin/!isBanned
// check (see requireAdmin's docstring for why that check isn't cached).
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/stats", asyncHandler(adminController.stats));

adminRouter.get("/users", validate({ query: adminUserListQuerySchema }), asyncHandler(adminController.listUsers));
adminRouter.post("/users/:userId/ban", validate({ body: banUserSchema }), asyncHandler(adminController.banUser));
adminRouter.post("/users/:userId/unban", asyncHandler(adminController.unbanUser));
adminRouter.patch("/users/:userId/verified", validate({ body: setVerifiedSchema }), asyncHandler(adminController.setVerified));

adminRouter.get("/reports", validate({ query: adminReportListQuerySchema }), asyncHandler(adminController.listReports));
adminRouter.post("/reports/:reportId/resolve", validate({ body: resolveReportSchema }), asyncHandler(adminController.resolveReport));

adminRouter.delete("/posts/:postId", asyncHandler(adminController.deletePost));
adminRouter.delete("/comments/:commentId", asyncHandler(adminController.deleteComment));
