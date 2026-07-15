/**
 * Client-side validation helpers. These run BEFORE any Supabase API call so a
 * non-technical user gets immediate, friendly feedback instead of a raw server error.
 */

import { extname } from "node:path";
import { BUCKET_NAME_HELP, BUCKET_NAME_PATTERN } from "./config.js";
import { FriendlyError } from "./errors.js";

/**
 * Validate a bucket name against the naming convention.
 * @throws FriendlyError with the convention help text if the name doesn't match.
 */
export function validateBucketName(name: string): void {
  if (!BUCKET_NAME_PATTERN.test(name)) {
    throw new FriendlyError(
      `"${name}" isn't a valid bucket name. ${BUCKET_NAME_HELP}`,
    );
  }
}

/** Human-friendly byte formatting, e.g. 52428800 -> "50 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const rounded = value >= 10 || Number.isInteger(value) ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

/**
 * Minimal extension -> MIME map covering the common marketing media types. We avoid a
 * third-party dependency for a disposable tool; unknown extensions fall back to a generic
 * binary type (which the bucket's allow-list will then reject if it's restricted).
 */
const EXTENSION_MIME: Record<string, string> = {
  // images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  // video
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  // audio
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  // documents / design
  ".pdf": "application/pdf",
};

/**
 * Guess a file's MIME type from its extension. Returns a concrete type, or
 * "application/octet-stream" when the extension is unknown.
 */
export function guessMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

/**
 * Check whether a concrete MIME type (e.g. "image/png") is permitted by a bucket's
 * allow-list, which may contain wildcards ("image/*") or be null (everything allowed).
 */
export function mimeAllowed(mime: string, allowed: string[] | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true; // null/empty => no restriction
  const [type] = mime.split("/");
  return allowed.some((pattern) => {
    if (pattern === mime) return true;
    if (pattern === "*/*" || pattern === "*") return true;
    if (pattern.endsWith("/*")) return pattern.slice(0, -2) === type;
    return false;
  });
}

/** Config we read back from a bucket to validate an upload against. */
export interface BucketConstraints {
  name: string;
  allowedMimeTypes: string[] | null;
  fileSizeLimitBytes: number | null;
}

/**
 * Validate a pending upload against the target bucket's constraints.
 * @throws FriendlyError if the file is the wrong type or too large.
 */
export function validateUpload(
  file: { mime: string; sizeBytes: number },
  bucket: BucketConstraints,
): void {
  if (!mimeAllowed(file.mime, bucket.allowedMimeTypes)) {
    const allowedList = bucket.allowedMimeTypes?.join(", ") || "any type";
    throw new FriendlyError(
      `This file looks like "${file.mime}", which isn't allowed in bucket "${bucket.name}". That bucket accepts: ${allowedList}. Use a different file type or a different bucket.`,
    );
  }
  if (
    bucket.fileSizeLimitBytes != null &&
    bucket.fileSizeLimitBytes > 0 &&
    file.sizeBytes > bucket.fileSizeLimitBytes
  ) {
    throw new FriendlyError(
      `This file is ${formatBytes(file.sizeBytes)}, but bucket "${bucket.name}" only allows files up to ${formatBytes(
        bucket.fileSizeLimitBytes,
      )}. Use a smaller file, or ask whoever set up the plugin to raise the bucket's limit.`,
    );
  }
}
