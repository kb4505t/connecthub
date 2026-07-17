import { prisma } from "../config/db";
import { logger } from "../config/logger";
import { storageService } from "../services/storage.service";

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes — stories are already invisible once expired (every read query filters `expiresAt > now`), so this is cleanup, not correctness

/**
 * Deletes stories whose `expiresAt` has passed. Every query that reads
 * stories already filters `expiresAt: { gt: now }`, so an expired-but-not-
 * yet-deleted row is never actually shown to anyone — this job exists to
 * reclaim Supabase Storage space and keep the `stories`/`story_views`
 * tables from growing forever, not to enforce the 24h rule itself.
 *
 * Same single-instance caveat as `publishScheduledPosts.ts`: a simple
 * in-process poller, fine for one API instance, not safe if this API is
 * ever horizontally scaled without a locking scheme.
 */
async function deleteExpiredStories() {
  const expired = await prisma.story.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, mediaUrl: true },
  });

  if (expired.length === 0) return;

  await prisma.story.deleteMany({ where: { id: { in: expired.map((s) => s.id) } } });

  // Best-effort, run after the DB rows are gone so a slow/failed storage
  // delete never blocks (or reappears in) the next poll cycle.
  await Promise.all(expired.map((s) => storageService.deleteByPublicUrl("story-media", s.mediaUrl)));

  logger.info(`Deleted ${expired.length} expired stor${expired.length === 1 ? "y" : "ies"}`);
}

export function startExpireStoriesJob() {
  const intervalId = setInterval(() => {
    deleteExpiredStories().catch((err) => logger.error("Expire stories job failed:", err));
  }, CHECK_INTERVAL_MS);

  deleteExpiredStories().catch((err) => logger.error("Expire stories job failed:", err));

  return () => clearInterval(intervalId);
}
