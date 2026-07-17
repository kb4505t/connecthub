import { Request, Response } from "express";
import { adminService } from "../services/admin.service";
import type { AdminUserListQuery, AdminReportListQuery, BanUserInput, ResolveReportInput } from "@connecthub/shared-types";

export const adminController = {
  async stats(_req: Request, res: Response) {
    const data = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data });
  },

  async listUsers(req: Request, res: Response) {
    const query = req.query as unknown as AdminUserListQuery;
    const data = await adminService.listUsers(query);
    res.status(200).json({ success: true, data });
  },

  async banUser(req: Request, res: Response) {
    const { reason } = req.body as BanUserInput;
    await adminService.banUser(req.user!.id, req.params.userId, reason);
    res.status(200).json({ success: true, message: "User banned" });
  },

  async unbanUser(req: Request, res: Response) {
    await adminService.unbanUser(req.params.userId);
    res.status(200).json({ success: true, message: "User unbanned" });
  },

  async setVerified(req: Request, res: Response) {
    const { isVerified } = req.body as { isVerified: boolean };
    await adminService.setVerified(req.params.userId, isVerified);
    res.status(200).json({ success: true, message: isVerified ? "User verified" : "Verification removed" });
  },

  async listReports(req: Request, res: Response) {
    const query = req.query as unknown as AdminReportListQuery;
    const data = await adminService.listReports(query);
    res.status(200).json({ success: true, data });
  },

  async resolveReport(req: Request, res: Response) {
    const input = req.body as ResolveReportInput;
    await adminService.resolveReport(req.user!.id, req.params.reportId, input);
    res.status(200).json({ success: true, message: "Report resolved" });
  },

  async deletePost(req: Request, res: Response) {
    await adminService.deletePost(req.params.postId);
    res.status(200).json({ success: true, message: "Post removed" });
  },

  async deleteComment(req: Request, res: Response) {
    await adminService.deleteComment(req.params.commentId);
    res.status(200).json({ success: true, message: "Comment removed" });
  },
};
