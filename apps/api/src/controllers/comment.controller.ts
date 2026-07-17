import { Request, Response } from "express";
import { commentService } from "../services/comment.service";

export const commentController = {
  async create(req: Request, res: Response) {
    const { content, parentId } = req.body;
    const comment = await commentService.createComment(req.params.postId, req.user!.id, content, parentId);
    res.status(201).json({ success: true, message: "Comment posted", data: { comment } });
  },

  async getForPost(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await commentService.getCommentsForPost(req.params.postId, req.user?.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async getReplies(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await commentService.getReplies(req.params.id, req.user?.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async update(req: Request, res: Response) {
    const comment = await commentService.updateComment(req.params.id, req.user!.id, req.body.content);
    res.status(200).json({ success: true, message: "Comment updated", data: { comment } });
  },

  async remove(req: Request, res: Response) {
    await commentService.deleteComment(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Comment deleted" });
  },

  async react(req: Request, res: Response) {
    await commentService.reactToComment(req.params.id, req.user!.id, req.body.emoji);
    res.status(200).json({ success: true, message: "Reaction added" });
  },

  async removeReaction(req: Request, res: Response) {
    await commentService.removeReaction(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Reaction removed" });
  },
};
