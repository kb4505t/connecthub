import type { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { paginate } from "../utils/pagination";
import type { AdminUserListQuery, AdminReportListQuery, ResolveReportInput } from "@connecthub/shared-types";

const DAY_MS = 86_400_000;

/** Buckets a list of timestamps into a fixed-size, zero-filled daily histogram (oldest first). */
function bucketByDay(dates: Date[], days: number): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

async function buildTargetPreview(targetType: "POST" | "COMMENT" | "USER", targetId: string) {
  if (targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: targetId },
      select: { content: true, deletedAt: true, author: { select: { username: true } } },
    });
    if (!post) return { label: "[post deleted]", authorUsername: null, deleted: true };
    return {
      label: post.content?.slice(0, 140) || "[media post]",
      authorUsername: post.author.username,
      deleted: !!post.deletedAt,
    };
  }
  if (targetType === "COMMENT") {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: { content: true, deletedAt: true, author: { select: { username: true } } },
    });
    if (!comment) return { label: "[comment deleted]", authorUsername: null, deleted: true };
    return { label: comment.content.slice(0, 140), authorUsername: comment.author.username, deleted: !!comment.deletedAt };
  }
  // USER
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: { username: true, isBanned: true } });
  if (!user) return { label: "[account deleted]", authorUsername: null, deleted: true };
  return { label: `@${user.username}`, authorUsername: user.username, deleted: user.isBanned };
}

export const adminService = {
  // -------------------------------------------------------------------------
  // Dashboard / analytics
  // -------------------------------------------------------------------------

  async getDashboardStats() {
    const since30d = new Date(Date.now() - 30 * DAY_MS);
    const since7d = new Date(Date.now() - 7 * DAY_MS);

    const [
      usersCount,
      postsCount,
      commentsCount,
      pendingReports,
      newUsers7d,
      newPosts7d,
      recentSignups,
      recentPosts,
      topHashtags,
      topPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.post.count({ where: { deletedAt: null, createdAt: { gte: since7d } } }),
      prisma.user.findMany({ where: { createdAt: { gte: since30d } }, select: { createdAt: true } }),
      prisma.post.findMany({ where: { deletedAt: null, createdAt: { gte: since30d } }, select: { createdAt: true } }),
      prisma.hashtag.findMany({
        include: { _count: { select: { posts: true } } },
        orderBy: { posts: { _count: "desc" } },
        take: 8,
      }),
      prisma.post.findMany({
        where: { deletedAt: null, createdAt: { gte: since7d } },
        include: { author: { select: { username: true } }, _count: { select: { likes: true, comments: true } } },
        orderBy: [{ likes: { _count: "desc" } }, { comments: { _count: "desc" } }],
        take: 5,
      }),
    ]);

    return {
      totals: { users: usersCount, posts: postsCount, comments: commentsCount, pendingReports },
      newUsersLast7Days: newUsers7d,
      newPostsLast7Days: newPosts7d,
      signupsByDay: bucketByDay(recentSignups.map((u) => u.createdAt), 30),
      postsByDay: bucketByDay(recentPosts.map((p) => p.createdAt), 30),
      trendingHashtags: topHashtags.map((h) => ({ tag: h.tag, postsCount: h._count.posts })),
      topPosts: topPosts.map((p) => ({
        id: p.id,
        content: p.content,
        authorUsername: p.author.username,
        likesCount: p._count.likes,
        commentsCount: p._count.comments,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  },

  // -------------------------------------------------------------------------
  // User management
  // -------------------------------------------------------------------------

  async listUsers(query: AdminUserListQuery) {
    const { q, filter, cursor, limit } = query;

    const where: Prisma.UserWhereInput = {
      ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } : {}),
      ...(filter === "banned" ? { isBanned: true } : {}),
      ...(filter === "admin" ? { isAdmin: true } : {}),
      ...(filter === "verified" ? { isVerified: true } : {}),
    };

    const rows = await prisma.user.findMany({
      where,
      include: { _count: { select: { posts: true, followers: true } } },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);
    return {
      items: items.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        isVerified: u.isVerified,
        isAdmin: u.isAdmin,
        isBanned: u.isBanned,
        banReason: u.banReason,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt.toISOString(),
        postsCount: u._count.posts,
        followersCount: u._count.followers,
      })),
      nextCursor,
    };
  },

  async banUser(adminId: string, targetUserId: string, reason: string) {
    if (adminId === targetUserId) throw AppError.badRequest("You can't ban your own account");

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw AppError.notFound("User not found");
    if (target.isAdmin) throw AppError.forbidden("Admins can't ban other admins");

    await prisma.$transaction([
      prisma.user.update({ where: { id: targetUserId }, data: { isBanned: true, banReason: reason, bannedAt: new Date() } }),
      // Force logout everywhere: revoke all outstanding refresh tokens.
      prisma.refreshToken.updateMany({ where: { userId: targetUserId, revoked: false }, data: { revoked: true } }),
    ]);
  },

  async unbanUser(targetUserId: string) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw AppError.notFound("User not found");

    await prisma.user.update({ where: { id: targetUserId }, data: { isBanned: false, banReason: null, bannedAt: null } });
  },

  async setVerified(targetUserId: string, isVerified: boolean) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw AppError.notFound("User not found");

    await prisma.user.update({ where: { id: targetUserId }, data: { isVerified } });
  },

  // -------------------------------------------------------------------------
  // Reports / moderation queue
  // -------------------------------------------------------------------------

  async listReports(query: AdminReportListQuery) {
    const { status, targetType, cursor, limit } = query;

    const where: Prisma.ReportWhereInput = {
      ...(status !== "ALL" ? { status } : {}),
      ...(targetType !== "ALL" ? { targetType } : {}),
    };

    const rows = await prisma.report.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, avatarUrl: true } },
        reviewer: { select: { id: true, username: true } },
      },
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const { items, nextCursor } = paginate(rows, limit);

    const withPreviews = await Promise.all(
      items.map(async (r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        actionTaken: r.actionTaken,
        reviewNote: r.reviewNote,
        reporter: r.reporter,
        reviewer: r.reviewer,
        targetPreview: await buildTargetPreview(r.targetType, r.targetId),
      }))
    );

    return { items: withPreviews, nextCursor };
  },

  /**
   * Resolves a report with one of three actions:
   *  - DISMISS: no content/user action, just closes the report as unfounded.
   *  - REMOVE_CONTENT: soft-deletes the reported post/comment (no-op, still
   *    marked resolved, if the target is a user report — use BAN_USER instead).
   *  - BAN_USER: bans the author of the reported content (or the reported
   *    user directly, for USER-type reports).
   */
  async resolveReport(adminId: string, reportId: string, input: ResolveReportInput) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw AppError.notFound("Report not found");
    if (report.status === "RESOLVED" || report.status === "DISMISSED") {
      throw AppError.conflict("This report has already been resolved");
    }

    if (input.action === "REMOVE_CONTENT") {
      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({ where: { id: report.targetId } });
        if (!post || post.deletedAt) throw AppError.notFound("Reported post no longer exists");
        await prisma.post.update({ where: { id: report.targetId }, data: { deletedAt: new Date(), isPinned: false } });
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({ where: { id: report.targetId } });
        if (!comment || comment.deletedAt) throw AppError.notFound("Reported comment no longer exists");
        await prisma.comment.update({ where: { id: report.targetId }, data: { deletedAt: new Date() } });
      } else {
        throw AppError.badRequest("Use BAN_USER to action a reported account");
      }
    }

    if (input.action === "BAN_USER") {
      let targetUserId = report.targetId;
      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
        if (!post) throw AppError.notFound("Reported post no longer exists");
        targetUserId = post.authorId;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
        if (!comment) throw AppError.notFound("Reported comment no longer exists");
        targetUserId = comment.authorId;
      }
      await adminService.banUser(adminId, targetUserId, input.note || `Banned via report ${reportId}: ${report.reason}`);
    }

    const status = input.action === "DISMISS" ? "DISMISSED" : "RESOLVED";
    await prisma.report.update({
      where: { id: reportId },
      data: { status, resolvedAt: new Date(), reviewerId: adminId, actionTaken: input.action, reviewNote: input.note ?? null },
    });
  },

  // -------------------------------------------------------------------------
  // Direct content moderation (outside the report flow, e.g. proactive sweep)
  // -------------------------------------------------------------------------

  async deletePost(postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) throw AppError.notFound("Post not found");
    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date(), isPinned: false } });
  },

  async deleteComment(commentId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) throw AppError.notFound("Comment not found");
    await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  },
};
