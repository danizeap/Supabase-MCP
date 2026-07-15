/**
 * get_signed_url — create a time-limited signed URL for a file (works for private buckets).
 */
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { DEFAULT_SIGNED_URL_EXPIRY_SECONDS, MAX_SIGNED_URL_EXPIRY_SECONDS, } from "../config.js";
import { defineTool } from "./tool.js";
const DEFAULT_DAYS = DEFAULT_SIGNED_URL_EXPIRY_SECONDS / 86400;
const MAX_DAYS = MAX_SIGNED_URL_EXPIRY_SECONDS / 86400;
export default defineTool({
    name: "get_signed_url",
    title: "Get a shareable link (signed)",
    description: `Create a temporary shareable link to a file. This works for PRIVATE buckets: anyone with the ` +
        `link can view the file until it expires. The default link lasts ${DEFAULT_DAYS} days; you can ask ` +
        `for anywhere from 1 to ${MAX_DAYS} days. Use this to share media that shouldn't be public forever.`,
    inputSchema: {
        bucket: z.string().describe("The bucket the file is in."),
        file_path: z
            .string()
            .describe("Path to the file inside the bucket, e.g. 'logo.png' or 'logos/logo.png'. Use 'list_files' to find it."),
        expires_in_days: z
            .number()
            .positive()
            .max(MAX_DAYS)
            .optional()
            .describe(`How many days the link stays valid. Default ${DEFAULT_DAYS}, maximum ${MAX_DAYS}.`),
    },
    async run(args) {
        const seconds = args.expires_in_days != null
            ? Math.round(args.expires_in_days * 86400)
            : DEFAULT_SIGNED_URL_EXPIRY_SECONDS;
        const path = args.file_path.replace(/^\/+/, "");
        const supabase = getSupabase();
        const { data, error } = await supabase.storage
            .from(args.bucket)
            .createSignedUrl(path, seconds);
        if (error || !data?.signedUrl) {
            throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket, path }));
        }
        const days = Math.round((seconds / 86400) * 10) / 10;
        return (`Shareable link for "${path}" (valid for ${days} day${days === 1 ? "" : "s"}):\n` +
            `${data.signedUrl}\n\n` +
            `Anyone with this link can view the file until it expires.`);
    },
});
