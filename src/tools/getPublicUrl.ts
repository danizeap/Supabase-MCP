/**
 * get_public_url — return the permanent public web URL for a file in a PUBLIC bucket.
 * If the bucket is private, we explain that and point to get_signed_url instead.
 */

import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { defineTool } from "./tool.js";

export default defineTool({
  name: "get_public_url",
  title: "Get a public web link",
  description:
    "Get the permanent public web link for a file. This only works for PUBLIC buckets — files anyone " +
    "can view. If the bucket is private, this explains that and points you to 'get_signed_url' for a " +
    "temporary link instead. Use this for logos, campaign images, and other openly shared assets.",
  inputSchema: {
    bucket: z.string().describe("The bucket the file is in (must be a public bucket)."),
    file_path: z
      .string()
      .describe("Path to the file inside the bucket, e.g. 'logo.png' or 'logos/logo.png'."),
  },
  async run(args): Promise<string> {
    const supabase = getSupabase();
    const path = args.file_path.replace(/^\/+/, "");

    // Confirm the bucket exists and is public before handing back a URL that would 404.
    const { data: bucket, error } = await supabase.storage.getBucket(args.bucket);
    if (error || !bucket) {
      throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket }));
    }
    if (!bucket.public) {
      throw new FriendlyError(
        `Bucket "${args.bucket}" is private, so it has no public link. Make a temporary shareable link instead with "get_signed_url", or (if these files are meant to be public) create a public bucket.`,
      );
    }

    const { data } = supabase.storage.from(args.bucket).getPublicUrl(path);
    return `Public link for "${path}":\n${data.publicUrl}\n\nThis link is permanent while the bucket stays public.`;
  },
});
