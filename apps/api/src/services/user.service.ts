import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { storageService } from "./storage.service";
import { paginate } from "../utils/pagination";
import { notificationService } from "./notification.service";
import type { UpdateProfileInput } from "@connecthub/shared-types";

function toProfile(
  user: {
    id: string;
    username: string;
    fullName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    website: string | null;
    location: string | null;
    isVerified: boolean;
    isPrivate: boolean;
    createdAt: Date;
    _count: { followers: number; following: number; posts: number };
  },
  viewerId: string | undefined,
  isFollowing: boolean,
  isFollowedBy: boolean
) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    coverImageUrl: user.coverImageUrl,
    website: user.website,
    location: user.location,
    isVerified: user.isVerified,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt.toISOString(),
    followersCount: user._count.followers,
    followingCount: user._count.following,
    postsCount: user._count.posts,
    isFollowing,
    isFollowedBy,
    isOwnProfile: viewerId === user.id,
  };
}

export const userService = {
  async getProfileByUsername(username: string, viewerId: string | undefined) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { _count: { select: { followers: true, following: true, posts: { where: { deletedAt: null } } } } },
    });
    if (!user || user.isBanned) throw AppError.notFound("User not found");

    let isFollowing = false;
    let isFollowedBy = false;
    if (viewerId && viewerId !== user.id) {
      const [followingRow, followedByRow] = await Promise.all([
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } }),
        prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: viewerId } } }),
      ]);
      isFollowing = !!followingRow;
      isFollowedBy = !!followedByRow;
    }

    return toProfile(user, viewerId, isFollowing, isFollowedBy);
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        bio: input.bio,
        website: input.website === "" ? null : input.website,
        location: input.location,
      },
      include: { _count: { select: { followers: true, following: true, posts: { where: { deletedAt: null } } } } },
    });
    return toProfile(user, userId, false, false);
  },

  async updatePrivacy(userId: string, isPrivate: boolean) {
    await prisma.user.update({ where: { id: userId }, data: { isPrivate } });
  },

  async uploadAvatar(userId: string, fileBuffer: Buffer) {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const avatarUrl = await storageService.uploadAvatar(userId, fileBuffer);
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    if (existing.avatarUrl) await storageService.deleteByPublicUrl("avatars", existing.avatarUrl);
    return avatarUrl;
  },

  async uploadCoverImage(userId: string, fileBuffer: Buffer) {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const coverImageUrl = await storageService.uploadCoverImage(userId, fileBuffer);
    await prisma.user.update({ where: { id: userId }, data: { coverImageUrl } });
    if (existing.coverImageUrl) await storageService.deleteByPublicUrl("covers", existing.coverImageUrl);
    return coverImageUrl;
  },

  async removeAvatar(userId: string) {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    if (existing.avatarUrl) await storageService.deleteByPublicUrl("avatars", existing.avatarUrl);
  },

  async removeCoverImage(userId: string) {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({ where: { id: userId }, data: { coverImageUrl: null } });
    if (existing.coverImageUrl) await storageService.deleteByPublicUrl("covers", existing.coverImageUrl);
  },

  async followUser(followerId: string, targetUsername: string) {
    const target = await prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw AppError.notFound("User not found");
    if (target.id === followerId) throw AppError.badRequest("You can't follow yourself");

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: target.id },
          { blockerId: target.id, blockedId: followerId },
        ],
      },
    });
    if (blocked) throw AppError.forbidden("You can't follow this user");

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      update: {},
      create: { followerId, followingId: target.id },
    });

    await notificationService.create({ type: "FOLLOW", recipientId: target.id, actorId: followerId });
  },

  async unfollowUser(followerId: string, targetUsername: string) {
    const target = await prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw AppError.notFound("User not found");

    await prisma.follow.deleteMany({ where: { followerId, followingId: target.id } });
  },

  async listFollowers(username: string, cursor: string | undefined, limit: number) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw AppError.notFound("User not found");

    const rows = await prisma.follow.findMany({
      where: { followingId: user.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: { follower: true },
    });

    const { items, nextCursor } = paginate(rows, limit);
    return {
      items: items.map((r) => ({
        id: r.follower.id,
        username: r.follower.username,
        fullName: r.follower.fullName,
        avatarUrl: r.follower.avatarUrl,
        isVerified: r.follower.isVerified,
      })),
      nextCursor,
    };
  },

  async listFollowing(username: string, cursor: string | undefined, limit: number) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw AppError.notFound("User not found");

    const rows = await prisma.follow.findMany({
      where: { followerId: user.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "desc" },
      include: { following: true },
    });

    const { items, nextCursor } = paginate(rows, limit);
    return {
      items: items.map((r) => ({
        id: r.following.id,
        username: r.following.username,
        fullName: r.following.fullName,
        avatarUrl: r.following.avatarUrl,
        isVerified: r.following.isVerified,
      })),
      nextCursor,
    };
  },

  /**
   * Case-insensitive match on username or display name. Deliberately simple
   * substring search (`contains`), not full-text — the user base and query
   * length here don't justify a trigram index or search extension, and
   * `contains` degrades gracefully (no "no results because of one typo"
   * surprise that a stricter full-text `@@` match could produce).
   */
  async searchUsers(viewerId: string | undefined, query: string, cursor: string | undefined, limit: number) {
    const rows = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [{ username: { contains: query, mode: "insensitive" } }, { fullName: { contains: query, mode: "insensitive" } }],
      },
      orderBy: { username: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);

    // One extra query for follow state, batched across the whole page rather than N+1.
    const followedIds = viewerId
      ? new Set(
          (
            await prisma.follow.findMany({
              where: { followerId: viewerId, followingId: { in: items.map((u) => u.id) } },
              select: { followingId: true },
            })
          ).map((f) => f.followingId)
        )
      : new Set<string>();

    return {
      items: items.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        bio: u.bio,
        isFollowedByViewer: followedIds.has(u.id),
      })),
      nextCursor,
    };
  },
};
