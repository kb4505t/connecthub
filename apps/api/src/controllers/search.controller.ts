import { Request, Response } from "express";
import { searchService } from "../services/search.service";
import { userService } from "../services/user.service";
import { postService } from "../services/post.service";

export const searchController = {
  async preview(req: Request, res: Response) {
    const { q } = req.query as unknown as { q: string };
    const result = await searchService.searchPreview(req.user?.id, q);
    res.status(200).json({ success: true, data: result });
  },

  async users(req: Request, res: Response) {
    const { q, cursor, limit } = req.query as unknown as { q: string; cursor?: string; limit: number };
    const result = await userService.searchUsers(req.user?.id, q, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async posts(req: Request, res: Response) {
    const { q, cursor, limit } = req.query as unknown as { q: string; cursor?: string; limit: number };
    const result = await postService.searchPosts(req.user?.id, q, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async hashtags(req: Request, res: Response) {
    const { q, cursor, limit } = req.query as unknown as { q: string; cursor?: string; limit: number };
    const result = await searchService.searchHashtags(q, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },
};
