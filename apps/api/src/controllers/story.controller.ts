import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { storyService } from "../services/story.service";

export const storyController = {
  async create(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest("Story media is required");
    const story = await storyService.createStory(req.user!.id, { buffer: req.file.buffer, mimetype: req.file.mimetype });
    res.status(201).json({ success: true, message: "Story posted", data: { story } });
  },

  async getFeed(req: Request, res: Response) {
    const groups = await storyService.getStoryFeed(req.user!.id);
    res.status(200).json({ success: true, data: { groups } });
  },

  async recordView(req: Request, res: Response) {
    await storyService.recordView(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "View recorded" });
  },

  async getViewers(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await storyService.getStoryViewers(req.params.id, req.user!.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async remove(req: Request, res: Response) {
    await storyService.deleteStory(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Story deleted" });
  },
};
