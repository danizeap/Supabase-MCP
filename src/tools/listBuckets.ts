/**
 * list_buckets — show all storage buckets and their configuration.
 */

import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { formatBytes } from "../validation.js";
import { defineTool } from "./tool.js";

export default defineTool({
  name: "list_buckets",
  title: "List storage buckets",
  description:
    "List all Supabase Storage buckets with their settings: whether each is public or private, its file size limit, and which file types it accepts. Use this first when someone asks 'where can I upload this?' or before creating a new bucket, so you don't duplicate one that already exists.",
  inputSchema: {},
  async run(): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw new FriendlyError(toFriendlyMessage(error));
    if (!data || data.length === 0) {
      return 'There are no storage buckets yet. Create one with "create_bucket" (for example a bucket named "marketing-assets").';
    }

    const lines = data.map((b) => {
      const visibility = b.public ? "public" : "private";
      const size =
        b.file_size_limit != null && b.file_size_limit > 0
          ? formatBytes(b.file_size_limit)
          : "no limit";
      const types =
        Array.isArray(b.allowed_mime_types) && b.allowed_mime_types.length > 0
          ? b.allowed_mime_types.join(", ")
          : "any type";
      return `• ${b.name} — ${visibility}, max file size: ${size}, accepts: ${types}`;
    });

    return `Found ${data.length} bucket${data.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
  },
});
