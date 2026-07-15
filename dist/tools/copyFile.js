/**
 * copy_file — copy a file to another place (same bucket or a different bucket) WITHOUT
 * removing the original. Additive and safe. Refuses to overwrite.
 */
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { objectExists } from "../storage-helpers.js";
import { defineTool } from "./tool.js";
export default defineTool({
    name: "copy_file",
    title: "Copy a file",
    description: "Make a copy of a file somewhere else — in the same bucket, or in a DIFFERENT bucket (set " +
        "to_bucket) — while leaving the original exactly where it is. This is the tool for 'grab these " +
        "from this bucket and put a copy in that bucket.' It NEVER overwrites: if something already " +
        "exists at the destination, it fails and asks for a different name.",
    inputSchema: {
        bucket: z.string().describe("The bucket the original file is in."),
        from_path: z
            .string()
            .describe("Path of the file to copy, e.g. 'logo.png' or 'logos/logo.png'."),
        to_path: z
            .string()
            .describe("Destination path/name for the copy, e.g. 'archive/logo.png'."),
        to_bucket: z
            .string()
            .optional()
            .describe("Optional: put the copy in a DIFFERENT bucket. Omit to copy within the same bucket."),
    },
    async run(args) {
        const from = args.from_path.replace(/^\/+/, "");
        const to = args.to_path.replace(/^\/+/, "");
        const destBucket = args.to_bucket?.trim() || args.bucket;
        const crossBucket = destBucket !== args.bucket;
        if (from === to && !crossBucket) {
            throw new FriendlyError("The copy would land on top of the original — give the copy a different name or a different bucket.");
        }
        const supabase = getSupabase();
        // Guardrail: refuse if the destination is occupied (never overwrite).
        if (await objectExists(supabase, destBucket, to)) {
            throw new FriendlyError(`A file already exists at "${to}" in bucket "${destBucket}". Choose a different name — this plugin never overwrites existing files.`);
        }
        const { error } = await supabase.storage
            .from(args.bucket)
            .copy(from, to, crossBucket ? { destinationBucket: destBucket } : undefined);
        if (error) {
            throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket, path: from }));
        }
        const where = crossBucket ? `into bucket "${destBucket}"` : `in bucket "${args.bucket}"`;
        return `Copied "${from}" to "${to}" ${where}. The original is still in "${args.bucket}".`;
    },
});
