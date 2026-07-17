import { Request, Response } from "express";
import { postService } from "../services/post.service";

export const postController = {
  async create(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[]) ?? [];
    const post = await postService.createPost(req.user!.id, req.body, files);
    res.status(201).json({ success: true, message: "Post created", data: { post } });
  },

  async getById(req: Request, res: Response) {
    const post = await postService.getPostById(req.params.id, req.user?.id);
    res.status(200).json({ success: true, data: { post } });
  },

  async getFeed(req: Request, res: Response) {
    const { cursor, limit, type } = req.query as unknown as { cursor?: string; limit: number; type: "following" | "latest" | "trending" };
    const result = await postService.getFeed(req.user?.id, type, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async getByUsername(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await postService.getPostsByUsername(req.params.username, req.user?.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async getByHashtag(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await postService.getPostsByHashtag(req.params.tag, req.user?.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async update(req: Request, res: Response) {
    const post = await postService.updatePost(req.params.id, req.user!.id, req.body);
    res.status(200).json({ success: true, message: "Post updated", data: { post } });
  },

  async remove(req: Request, res: Response) {
    await postService.deletePost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Post deleted" });
  },

  async pin(req: Request, res: Response) {
    await postService.pinPost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Post pinned" });
  },

  async unpin(req: Request, res: Response) {
    await postService.unpinPost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Post unpinned" });
  },

  async bookmark(req: Request, res: Response) {
    await postService.bookmarkPost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Post saved" });
  },

  async unbookmark(req: Request, res: Response) {
    await postService.unbookmarkPost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Post removed from saved" });
  },

  async like(req: Request, res: Response) {
    await postService.likePost(req.params.id, req.user!.id, req.body.emoji);
    res.status(200).json({ success: true, message: "Reaction added" });
  },

  async unlike(req: Request, res: Response) {
    await postService.unlikePost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Reaction removed" });
  },

  async getLikers(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await postService.getPostLikers(req.params.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async getBookmarks(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await postService.getBookmarks(req.user!.id, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async repost(req: Request, res: Response) {
    const post = await postService.repostPost(req.params.id, req.user!.id, req.body?.content);
    res.status(201).json({ success: true, message: "Reposted", data: { post } });
  },

  async undoRepost(req: Request, res: Response) {
    await postService.undoRepost(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: "Repost removed" });
  },

  async voteOnPoll(req: Request, res: Response) {
    await postService.voteOnPoll(req.params.pollId, req.user!.id, req.body.optionId);
    res.status(200).json({ success: true, message: "Vote recorded" });
  },
};
