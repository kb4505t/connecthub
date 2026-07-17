import multer from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-m4a"];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — generous ceiling; sharp compresses it down afterwards
const MAX_POST_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB — accommodates uncompressed video (see storage.service notes)
const MAX_POST_MEDIA_FILES = 10; // matches "multiple images" requirement with a sane ceiling
const MAX_MESSAGE_MEDIA_SIZE = 20 * 1024 * 1024; // 20MB — chat attachments are a single image or a short voice note, never a full video upload
const MAX_STORY_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB — a single image or a short video clip, well below a full post video's ceiling

/**
 * Stores the upload in memory (not disk) since we immediately pipe it
 * through sharp and up to Supabase Storage — nothing needs to persist on
 * the API server's filesystem, which also keeps this safe for ephemeral
 * containers (Render/Docker) with no persistent disk.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(AppError.badRequest("Only JPEG, PNG, WebP, and GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

/** Post media: accepts a mix of images and videos, multiple files, higher size ceiling. */
export const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_POST_MEDIA_SIZE, files: MAX_POST_MEDIA_FILES },
  fileFilter: (_req, file, cb) => {
    if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
      cb(AppError.badRequest("Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV"));
      return;
    }
    cb(null, true);
  },
}).array("media", MAX_POST_MEDIA_FILES);

export function isVideoMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

export function isAudioMimeType(mimeType: string): boolean {
  return ALLOWED_AUDIO_TYPES.includes(mimeType);
}

/**
 * A single chat attachment: either an image or a voice note, never both and
 * never more than one per message (unlike post media, which allows a batch).
 */
export const messageMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MESSAGE_MEDIA_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES].includes(file.mimetype)) {
      cb(AppError.badRequest("Unsupported attachment type. Allowed: JPEG, PNG, WebP, GIF, or a voice note"));
      return;
    }
    cb(null, true);
  },
}).single("media");

/** A story is always exactly one image or one video — never a batch like a post, never audio like a chat attachment. */
export const storyMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_STORY_MEDIA_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
      cb(AppError.badRequest("Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM, MOV"));
      return;
    }
    cb(null, true);
  },
}).single("media");

