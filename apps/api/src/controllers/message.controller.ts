import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { messageService } from "../services/message.service";

export const messageController = {
  async listConversations(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await messageService.getConversations(req.user!.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async getConversation(req: Request, res: Response) {
    const conversation = await messageService.getConversationById(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: { conversation } });
  },

  async startDirect(req: Request, res: Response) {
    const conversation = await messageService.getOrCreateDirectConversation(req.user!.id, req.body.username);
    res.status(200).json({ success: true, data: { conversation } });
  },

  async createGroup(req: Request, res: Response) {
    const conversation = await messageService.createGroupConversation(req.user!.id, req.body.name, req.body.usernames);
    res.status(201).json({ success: true, data: { conversation } });
  },

  async leave(req: Request, res: Response) {
    await messageService.leaveConversation(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Left the conversation" });
  },

  async getMessages(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await messageService.getMessages(req.params.id, req.user!.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async sendMessage(req: Request, res: Response) {
    const message = await messageService.sendTextMessage(req.params.id, req.user!.id, req.body.content);
    res.status(201).json({ success: true, data: { message } });
  },

  async sendMediaMessage(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest("An attachment file is required");
    const message = await messageService.sendMediaMessage(
      req.params.id,
      req.user!.id,
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      req.body.content
    );
    res.status(201).json({ success: true, data: { message } });
  },

  async markRead(req: Request, res: Response) {
    await messageService.markConversationRead(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Conversation marked as read" });
  },
};
