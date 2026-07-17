import sharp from "sharp";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Resizes to `width`x`height` (cropped to fill) and re-encodes as WebP.
 * WebP gives a meaningfully smaller file than the original JPEG/PNG at
 * equivalent visual quality — this is the "Compression" requirement from
 * the brief, applied server-side so no client is trusted to do it.
 */
async function processImage(buffer: Buffer, width: number, height: number): Promise<ProcessedImage> {
  const outBuffer = await sharp(buffer)
    .resize(width, height, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();

  return { buffer: outBuffer, contentType: "image/webp", extension: "webp" };
}

async function upload(bucket: string, path: string, image: ProcessedImage): Promise<string> {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, image.buffer, {
    contentType: image.contentType,
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    logger.error(`Supabase Storage upload failed [${bucket}/${path}]: ${error.message}`);
    throw AppError.internal("Failed to upload image. Please try again.");
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export const storageService = {
  /** Avatar: square, cropped to face/subject via sharp's "attention" strategy. */
  async uploadAvatar(userId: string, fileBuffer: Buffer): Promise<string> {
    const image = await processImage(fileBuffer, 512, 512);
    return upload("avatars", `${userId}/${randomUUID()}.webp`, image);
  },

  /** Cover image: wide banner aspect ratio. */
  async uploadCoverImage(userId: string, fileBuffer: Buffer): Promise<string> {
    const image = await processImage(fileBuffer, 1500, 500);
    return upload("covers", `${userId}/${randomUUID()}.webp`, image);
  },

  /** Post image: preserves aspect ratio (no forced crop), capped at 1920px on the long edge, re-encoded as WebP. */
  async uploadPostImage(userId: string, fileBuffer: Buffer): Promise<{ url: string; width: number; height: number }> {
    const pipeline = sharp(fileBuffer).resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 });
    const outBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outBuffer).metadata();
    const url = await upload("post-media", `${userId}/${randomUUID()}.webp`, {
      buffer: outBuffer,
      contentType: "image/webp",
      extension: "webp",
    });
    return { url, width: metadata.width ?? 0, height: metadata.height ?? 0 };
  },

  /**
   * Post video: uploaded as-is (no transcoding — that needs an ffmpeg pipeline,
   * which isn't part of this stack yet). Size is capped by the upload middleware,
   * not here. This is a known gap: the brief's "Compression" requirement for
   * video is unmet until a transcoding worker is added (see Phase 5 notes).
   */
  async uploadPostVideo(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split("/")[1] ?? "mp4";
    return upload("post-media", `${userId}/${randomUUID()}.${extension}`, {
      buffer: fileBuffer,
      contentType: mimeType,
      extension,
    });
  },

  /** Message image attachment: same treatment as a post image, just a different bucket/aspect cap. */
  async uploadMessageImage(userId: string, fileBuffer: Buffer): Promise<{ url: string; width: number; height: number }> {
    const pipeline = sharp(fileBuffer).resize(1280, 1280, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 });
    const outBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outBuffer).metadata();
    const url = await upload("message-media", `${userId}/${randomUUID()}.webp`, {
      buffer: outBuffer,
      contentType: "image/webp",
      extension: "webp",
    });
    return { url, width: metadata.width ?? 0, height: metadata.height ?? 0 };
  },

  /**
   * Voice message: uploaded as-is, same "no transcoding pipeline yet" caveat
   * as `uploadPostVideo` — the browser's MediaRecorder output (webm/m4a) is
   * stored directly rather than re-encoded to a single canonical format.
   */
  async uploadVoiceMessage(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split("/")[1] ?? "webm";
    return upload("message-media", `${userId}/${randomUUID()}.${extension}`, {
      buffer: fileBuffer,
      contentType: mimeType,
      extension,
    });
  },

  /** Story image: full-bleed vertical-friendly cap, same WebP treatment as post images. */
  async uploadStoryImage(userId: string, fileBuffer: Buffer): Promise<string> {
    const outBuffer = await sharp(fileBuffer).resize(1080, 1920, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    return upload("story-media", `${userId}/${randomUUID()}.webp`, {
      buffer: outBuffer,
      contentType: "image/webp",
      extension: "webp",
    });
  },

  /** Story video: same "uploaded as-is, no transcoding pipeline" caveat as post/message video. */
  async uploadStoryVideo(userId: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
    const extension = mimeType.split("/")[1] ?? "mp4";
    return upload("story-media", `${userId}/${randomUUID()}.${extension}`, {
      buffer: fileBuffer,
      contentType: mimeType,
      extension,
    });
  },

  /** Best-effort delete — never blocks the calling flow if it fails (e.g. old URL already gone). */
  async deleteByPublicUrl(bucket: string, publicUrl: string): Promise<void> {
    try {
      const marker = `/object/public/${bucket}/`;
      const idx = publicUrl.indexOf(marker);
      if (idx === -1) return;
      const path = publicUrl.slice(idx + marker.length);
      await supabaseAdmin.storage.from(bucket).remove([path]);
    } catch (err) {
      logger.warn(`Non-fatal: failed to delete old storage object: ${(err as Error).message}`);
    }
  },
};
