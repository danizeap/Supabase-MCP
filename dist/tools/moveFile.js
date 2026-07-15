/**
 * move_file — move or rename a file, within a bucket OR into a different bucket.
 * Relocates the file (the original path no longer holds it). Refuses to overwrite.
 */
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { objectExists } from "../storage-helpers.js";
import { defineTool } from "./tool.js";
export default defineTool({
    name: "move_file",
    title: "Move or rename a file",
    description: "Move or rename a file. It can move WITHIN a bucket (e.g. tidy 'draft.png' into 'logos/final.png') " +
        "or INTO A DIFFERENT bucket (set to_bucket). This relocates the file — the original path no longer " +
        "has it. It NEVER overwrites: if something already exists at the destination, the move fails and " +
        "asks for a different name. (To keep the original in place, use copy_file instead.)",
    inputSchema: {
        bucket: z.string().describe("The bucket the file currently lives in."),
        from_path: z
            .string()
            .describe("Current path of the file, e.g. 'draft.png' or 'logos/draft.png'."),
        to_path: z
            .string()
            .describe("New path/name for the file, e.g. 'logos/final.png'. Must not already exist."),
        to_bucket: z
            .string()
            .optional()
            .describe("Optional: move it into a DIFFERENT bucket. Omit to move within the same bucket."),
    },
    async run(args) {
        const from = args.from_path.replace(/^\/+/, "");
        const to = args.to_path.replace(/^\/+/, "");
        const destBucket = args.to_bucket?.trim() || args.bucket;
        const crossBucket = destBucket !== args.bucket;
        if (from === to && !crossBucket) {
            throw new FriendlyError("The new location is the same as the current one — nothing to move.");
        }
        const supabase = getSupabase();
        // Guardrail: refuse if the destination is occupied.
        if (await objectExists(supabase, destBucket, to)) {
            throw new FriendlyError(`A file already exists at "${to}" in bucket "${destBucket}". Choose a different name — this plugin never overwrites existing files.`);
        }
        const { error } = await supabase.storage
            .from(args.bucket)
            .move(from, to, crossBucket ? { destinationBucket: destBucket } : undefined);
        if (error) {
            throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket, path: from }));
        }
        const where = crossBucket
            ? `to "${to}" in bucket "${destBucket}"`
            : `to "${to}" in bucket "${args.bucket}"`;
        return `Moved "${from}" ${where}. The file is now only at the new location.`;
    },
});
