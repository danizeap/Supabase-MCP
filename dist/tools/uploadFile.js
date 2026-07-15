/**
 * upload_file — upload a local file to a bucket path, with client-side validation and a
 * hard no-overwrite guarantee (upsert: false).
 */
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { guessMimeType, validateUpload, formatBytes, } from "../validation.js";
import { defineTool } from "./tool.js";
/** Read a bucket's constraints; throws a friendly error if the bucket doesn't exist. */
async function getBucketConstraints(bucket) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.getBucket(bucket);
    if (error || !data) {
        throw new FriendlyError(toFriendlyMessage(error, { bucket }));
    }
    return {
        isPublic: Boolean(data.public),
        constraints: {
            name: bucket,
            allowedMimeTypes: data.allowed_mime_types ?? null,
            fileSizeLimitBytes: typeof data.file_size_limit === "number" ? data.file_size_limit : null,
        },
    };
}
export default defineTool({
    name: "upload_file",
    title: "Upload a file",
    description: "Upload a local file (image, video, audio, PDF, design asset) to a bucket. The file type and " +
        "size are checked against the bucket's rules BEFORE uploading, so problems are caught early with " +
        "a clear message. This NEVER overwrites: if a file with the same name already exists, the upload " +
        "fails and asks for a different name. On success it returns the stored path, and for private " +
        "buckets it reminds you to make a shareable link with 'get_signed_url'.",
    inputSchema: {
        bucket: z.string().describe("The bucket to upload into. Use 'list_buckets' to see options."),
        local_file_path: z
            .string()
            .describe("Full path to the file on this computer, e.g. C:/Users/me/Pictures/logo.png"),
        destination_path: z
            .string()
            .optional()
            .describe("Where to store it inside the bucket. Omit to use the file's own name. End with '/' to place it in a folder, e.g. 'logos/' stores it as logos/<filename>."),
        content_type: z
            .string()
            .optional()
            .describe("Optional MIME type override, e.g. 'image/png'. Normally auto-detected from the extension."),
    },
    async run(args) {
        // 1. Confirm the local file exists and is a regular file.
        let fileStat;
        try {
            fileStat = await stat(args.local_file_path);
        }
        catch {
            throw new FriendlyError(`Couldn't find a file at "${args.local_file_path}". Double-check the path (including drive letter and slashes) and try again.`);
        }
        if (!fileStat.isFile()) {
            throw new FriendlyError(`"${args.local_file_path}" is a folder, not a file. Point to a single file to upload.`);
        }
        // 2. Work out where it will live in the bucket.
        const fileName = basename(args.local_file_path);
        let destPath = args.destination_path?.trim() || fileName;
        if (destPath.endsWith("/"))
            destPath = `${destPath}${fileName}`;
        destPath = destPath.replace(/^\/+/, ""); // no leading slash
        // 3. Determine content type and validate against the bucket BEFORE uploading.
        const mime = args.content_type?.trim() || guessMimeType(args.local_file_path);
        const { constraints, isPublic } = await getBucketConstraints(args.bucket);
        validateUpload({ mime, sizeBytes: fileStat.size }, constraints);
        // 4. Read and upload with upsert:false (never overwrite).
        const bytes = await readFile(args.local_file_path);
        const supabase = getSupabase();
        const { data, error } = await supabase.storage
            .from(args.bucket)
            .upload(destPath, bytes, { contentType: mime, upsert: false });
        if (error) {
            throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket, path: destPath }));
        }
        // 5. Success message, with a next-step hint for private buckets.
        const stored = data?.path ?? destPath;
        const base = `Uploaded "${fileName}" (${formatBytes(fileStat.size)}) to bucket "${args.bucket}".\n` +
            `• Stored at: ${stored}`;
        if (isPublic) {
            return `${base}\n\nThis bucket is public — get its shareable web link with "get_public_url".`;
        }
        return `${base}\n\nThis bucket is private. To share this file, create a time-limited link with "get_signed_url".`;
    },
});
