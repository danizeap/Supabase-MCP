/**
 * Error translation: turn raw Supabase / network errors into plain-language messages
 * a non-technical user can act on. Every message should say what went wrong AND what to
 * do next.
 */
import { MissingCredentialsError } from "./supabase.js";
/**
 * A tool-level error whose message is already friendly and safe to show the user as-is.
 * Throw this from tool handlers for expected, validated failure cases (bad name, too big,
 * duplicate, etc.).
 */
export class FriendlyError extends Error {
    constructor(message) {
        super(message);
        this.name = "FriendlyError";
    }
}
function statusOf(err) {
    if (typeof err.status === "number")
        return err.status;
    if (typeof err.statusCode === "number")
        return err.statusCode;
    if (typeof err.statusCode === "string") {
        const n = Number.parseInt(err.statusCode, 10);
        if (!Number.isNaN(n))
            return n;
    }
    return undefined;
}
/**
 * Map a Supabase Storage error object to a friendly message.
 * `context` lets callers add specifics (e.g. the bucket or path involved).
 */
export function mapStorageError(err, context) {
    const e = (err ?? {});
    const raw = (e.message || e.error || "").toString();
    const lower = raw.toLowerCase();
    const status = statusOf(e);
    const where = context?.path
        ? ` ("${context.path}"${context.bucket ? ` in bucket "${context.bucket}"` : ""})`
        : context?.bucket
            ? ` (bucket "${context.bucket}")`
            : "";
    // Duplicate / already exists.
    if (status === 409 ||
        lower.includes("already exists") ||
        lower.includes("duplicate") ||
        lower.includes("resource already exists")) {
        return `That name is already taken${where}. Choose a different name — this plugin never overwrites existing files.`;
    }
    // Not found (bucket or object).
    if (status === 404 || lower.includes("not found") || lower.includes("does not exist")) {
        if (context?.bucket && !context?.path) {
            return `The bucket "${context.bucket}" doesn't exist. Run "list_buckets" to see what's available, or create it first with "create_bucket".`;
        }
        return `Couldn't find what was requested${where}. Run "list_buckets" or "list_files" to check the exact bucket and file names.`;
    }
    // File too large.
    if (status === 413 || lower.includes("payload too large") || lower.includes("maximum allowed size") || lower.includes("exceeded the maximum")) {
        return `That file is too large for this bucket${where}. Use a smaller file, or ask whoever set up the plugin to raise the bucket's size limit.`;
    }
    // Wrong / disallowed MIME type.
    if (lower.includes("mime type") || lower.includes("content type") || lower.includes("not allowed")) {
        return `That file type isn't allowed in this bucket${where}. Check the bucket's allowed types with "list_buckets", or use a different bucket.`;
    }
    // Auth / permission problems (bad or missing key).
    if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid jwt") || lower.includes("signature verification") || lower.includes("permission")) {
        return `The plugin couldn't authenticate with Supabase. Ask whoever set it up to double-check the SUPABASE_SERVICE_ROLE_KEY in the ".env" file.`;
    }
    // Invalid bucket name (server-side, in case something slips past our own check).
    if (lower.includes("invalid") && lower.includes("bucket")) {
        return `Supabase rejected that bucket name${where}. Bucket names must be lowercase with dashes.`;
    }
    // Fallback: include the raw message but keep it framed helpfully.
    return `Something went wrong with Supabase Storage${where}${raw ? `: ${raw}` : "."} If this keeps happening, ask whoever set up the plugin to check the Supabase project status and the ".env" settings.`;
}
/**
 * Top-level translator used by the server's tool dispatcher. Handles every error type
 * the tools can throw and always returns a user-safe string.
 */
export function toFriendlyMessage(err, context) {
    if (err instanceof FriendlyError)
        return err.message;
    if (err instanceof MissingCredentialsError)
        return err.message;
    // Network-level failures (DNS, offline, timeouts) surface as TypeError from fetch.
    const e = err;
    const lower = (e?.message || "").toString().toLowerCase();
    if (e?.name === "TypeError" ||
        lower.includes("fetch failed") ||
        lower.includes("network") ||
        lower.includes("enotfound") ||
        lower.includes("econnrefused") ||
        lower.includes("timeout")) {
        return `Couldn't reach Supabase — this looks like a network problem. Check your internet connection and that the SUPABASE_URL in ".env" is correct, then try again.`;
    }
    return mapStorageError(err, context);
}
