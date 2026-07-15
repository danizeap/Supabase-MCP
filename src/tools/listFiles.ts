/**
 * list_files — list files in a bucket, optionally under a folder prefix, with sizes and
 * timestamps.
 */

import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { formatBytes } from "../validation.js";
import { defineTool } from "./tool.js";

export default defineTool({
  name: "list_files",
  title: "List files in a bucket",
  description:
    "List the files in a bucket, with their sizes and last-updated dates. Optionally pass a folder " +
    "prefix (e.g. 'logos') to look inside a specific folder. Handy for checking what's already there " +
    "before uploading, or finding the exact path to make a shareable link.",
  inputSchema: {
    bucket: z.string().describe("The bucket to look in. Use 'list_buckets' to see options."),
    folder: z
      .string()
      .optional()
      .describe("Optional folder to list inside, e.g. 'logos' or 'campaigns/spring'. Omit for the top level."),
    limit: z
      .number()
      .int()
      .positive()
      .max(1000)
      .optional()
      .describe("Optional maximum number of files to return (default 100)."),
  },
  async run(args): Promise<string> {
    const supabase = getSupabase();
    const folder = args.folder?.replace(/^\/+|\/+$/g, "") || "";
    const { data, error } = await supabase.storage.from(args.bucket).list(folder, {
      limit: args.limit ?? 100,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket }));

    const where = folder ? `folder "${folder}" of bucket "${args.bucket}"` : `bucket "${args.bucket}"`;
    if (!data || data.length === 0) {
      return `No files found in ${where}.`;
    }

    const lines = data.map((item) => {
      // A row with no metadata.size is a subfolder rather than a file.
      const size = item.metadata?.size;
      const updated = item.updated_at ? new Date(item.updated_at).toISOString().slice(0, 10) : "—";
      if (size == null) {
        return `• ${item.name}/ (folder)`;
      }
      const path = folder ? `${folder}/${item.name}` : item.name;
      return `• ${path} — ${formatBytes(size)}, updated ${updated}`;
    });

    return `Contents of ${where} (${data.length} item${data.length === 1 ? "" : "s"}):\n${lines.join("\n")}`;
  },
});
