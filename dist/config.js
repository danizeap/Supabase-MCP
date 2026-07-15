/**
 * Central configuration and guardrail constants for the Supabase Storage plugin.
 *
 * Everything a future maintainer might want to tweak lives here: the bucket naming
 * convention, the default media types, and size defaults. Keeping these in one place
 * makes the plugin easy to extend without touching tool logic.
 */
/**
 * Allowed bucket-name prefixes. Extend this list to permit new categories — the
 * naming regex is rebuilt from it automatically.
 *
 * Example valid names: `marketing-q3-launch`, `brand-logos`, `campaigns-2026-spring`.
 */
export const ALLOWED_BUCKET_PREFIXES = [
    "marketing",
    "brand",
    "campaigns",
    "media",
    "assets",
];
/**
 * Bucket naming convention:
 *   - one of the allowed prefixes above
 *   - followed by one or more `-segment` groups
 *   - lowercase letters, digits, and dashes only (kebab-case)
 *
 * Produces e.g. /^(marketing|brand|campaigns|media|assets)(-[a-z0-9]+)+$/
 */
export const BUCKET_NAME_PATTERN = new RegExp(`^(${ALLOWED_BUCKET_PREFIXES.join("|")})(-[a-z0-9]+)+$`);
/**
 * Human-readable description of the naming rule, reused in tool descriptions and
 * error messages so the guidance stays consistent everywhere.
 */
export const BUCKET_NAME_HELP = `Bucket names must start with one of: ${ALLOWED_BUCKET_PREFIXES.join(", ")}, then use lowercase letters, numbers, and dashes (for example: "marketing-q3-launch" or "brand-logos").`;
/** Default file size limit for new buckets: 50 MB, expressed in bytes. */
export const DEFAULT_FILE_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;
/**
 * Default allowed MIME types for new buckets — common marketing media:
 * images, video, audio, and PDF. Wildcards (e.g. `image/*`) are supported by
 * Supabase and keep the list short and friendly.
 */
export const DEFAULT_ALLOWED_MIME_TYPES = [
    "image/*",
    "video/*",
    "audio/*",
    "application/pdf",
];
/** Default signed-URL expiry: 7 days, expressed in seconds. */
export const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
/** Maximum signed-URL expiry we allow callers to request: 30 days, in seconds. */
export const MAX_SIGNED_URL_EXPIRY_SECONDS = 30 * 24 * 60 * 60;
