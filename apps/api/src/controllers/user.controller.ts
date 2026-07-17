import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { AppError } from "../utils/AppError";

export const userController = {
  async getProfile(req: Request, res: Response) {
    const profile = await userService.getProfileByUsername(req.params.username, req.user?.id);
    res.status(200).json({ success: true, data: { profile } });
  },

  async updateProfile(req: Request, res: Response) {
    const profile = await userService.updateProfile(req.user!.id, req.body);
    res.status(200).json({ success: true, message: "Profile updated", data: { profile } });
  },

  async updatePrivacy(req: Request, res: Response) {
    await userService.updatePrivacy(req.user!.id, req.body.isPrivate);
    res.status(200).json({ success: true, message: "Privacy settings updated" });
  },

  async uploadAvatar(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest("No image file provided");
    const avatarUrl = await userService.uploadAvatar(req.user!.id, req.file.buffer);
    res.status(200).json({ success: true, message: "Avatar updated", data: { avatarUrl } });
  },

  async uploadCoverImage(req: Request, res: Response) {
    if (!req.file) throw AppError.badRequest("No image file provided");
    const coverImageUrl = await userService.uploadCoverImage(req.user!.id, req.file.buffer);
    res.status(200).json({ success: true, message: "Cover image updated", data: { coverImageUrl } });
  },

  async removeAvatar(req: Request, res: Response) {
    await userService.removeAvatar(req.user!.id);
    res.status(200).json({ success: true, message: "Avatar removed" });
  },

  async removeCoverImage(req: Request, res: Response) {
    await userService.removeCoverImage(req.user!.id);
    res.status(200).json({ success: true, message: "Cover image removed" });
  },

  async follow(req: Request, res: Response) {
    await userService.followUser(req.user!.id, req.params.username);
    res.status(200).json({ success: true, message: "Followed" });
  },

  async unfollow(req: Request, res: Response) {
    await userService.unfollowUser(req.user!.id, req.params.username);
    res.status(200).json({ success: true, message: "Unfollowed" });
  },

  async listFollowers(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await userService.listFollowers(req.params.username, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },

  async listFollowing(req: Request, res: Response) {
    const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
    const result = await userService.listFollowing(req.params.username, cursor, limit);
    res.status(200).json({ success: true, data: result });
  },
};
