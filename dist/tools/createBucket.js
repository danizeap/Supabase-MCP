/**
 * create_bucket — create a new storage bucket, enforcing the naming convention and
 * applying sensible media defaults.
 */
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { validateBucketName, formatBytes } from "../validation.js";
import { BUCKET_NAME_HELP, DEFAULT_ALLOWED_MIME_TYPES, DEFAULT_FILE_SIZE_LIMIT_BYTES, } from "../config.js";
import { defineTool } from "./tool.js";
export default defineTool({
    name: "create_bucket",
    title: "Create a storage bucket",
    description: `Create a new Supabase Storage bucket. ${BUCKET_NAME_HELP} ` +
        "By default the bucket is PRIVATE (files need a signed link to view), accepts common media " +
        "(images, video, audio, PDF), and limits files to 50MB. Set public=true only for assets meant " +
        "to be shared openly on the web. If the name breaks the convention or already exists, creation " +
        "fails with a clear explanation — nothing is overwritten.",
    inputSchema: {
        name: z
            .string()
            .describe('Bucket name. Must match the convention, e.g. "marketing-q3-launch" or "brand-logos".'),
        public: z
            .boolean()
            .default(false)
            .describe("true = anyone with the URL can view files (for openly shared assets). false (default) = private; files need a signed link."),
        allowed_mime_types: z
            .array(z.string())
            .optional()
            .describe('Optional list of allowed file types, e.g. ["image/*", "application/pdf"]. Defaults to common media types.'),
        file_size_limit_mb: z
            .number()
            .positive()
            .optional()
            .describe("Optional maximum file size in megabytes. Defaults to 50."),
    },
    async run(args) {
        validateBucketName(args.name);
        const allowedMime = args.allowed_mime_types && args.allowed_mime_types.length > 0
            ? args.allowed_mime_types
            : [...DEFAULT_ALLOWED_MIME_TYPES];
        const sizeLimitBytes = args.file_size_limit_mb != null
            ? Math.round(args.file_size_limit_mb * 1024 * 1024)
            : DEFAULT_FILE_SIZE_LIMIT_BYTES;
        const supabase = getSupabase();
        const { error } = await supabase.storage.createBucket(args.name, {
            public: args.public,
            allowedMimeTypes: allowedMime,
            fileSizeLimit: sizeLimitBytes,
        });
        if (error)
            throw new FriendlyError(toFriendlyMessage(error, { bucket: args.name }));
        const visibility = args.public
            ? "PUBLIC (anyone with the URL can view files)"
            : "private (files need a signed link to view)";
        return (`Created bucket "${args.name}".\n` +
            `• Visibility: ${visibility}\n` +
            `• Max file size: ${formatBytes(sizeLimitBytes)}\n` +
            `• Accepts: ${allowedMime.join(", ")}\n\n` +
            `You can now upload files to it with "upload_file".`);
    },
});
