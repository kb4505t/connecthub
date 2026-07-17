import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";

export const notificationController = {
  async list(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await notificationService.getNotifications(req.user!.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async unreadCount(req: Request, res: Response) {
    const count = await notificationService.getUnreadCount(req.user!.id);
    res.status(200).json({ success: true, data: { count } });
  },

  async markRead(req: Request, res: Response) {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Notification marked as read" });
  },

  async markAllRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(req.user!.id);
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  },
};
