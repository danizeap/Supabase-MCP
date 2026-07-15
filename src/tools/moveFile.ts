/**
 * move_file — move or rename a file within a bucket. Refuses to overwrite: if the
 * destination already exists, the move fails.
 */

import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { toFriendlyMessage, FriendlyError } from "../errors.js";
import { defineTool } from "./tool.js";

/** Split a bucket path into its parent folder and file name. */
function splitPath(path: string): { parent: string; name: string } {
  const clean = path.replace(/^\/+/, "");
  const idx = clean.lastIndexOf("/");
  if (idx === -1) return { parent: "", name: clean };
  return { parent: clean.slice(0, idx), name: clean.slice(idx + 1) };
}

/** Proactively check whether a path already holds a file (so we never overwrite). */
async function destinationExists(bucket: string, path: string): Promise<boolean> {
  const supabase = getSupabase();
  const { parent, name } = splitPath(path);
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(parent, { search: name, limit: 100 });
  if (error) throw new FriendlyError(toFriendlyMessage(error, { bucket, path }));
  return Boolean(data?.some((item) => item.name === name && item.metadata?.size != null));
}

export default defineTool({
  name: "move_file",
  title: "Move or rename a file",
  description:
    "Move or rename a file within a bucket (for example, tidy 'draft.png' into 'logos/final.png'). " +
    "This NEVER overwrites: if something already exists at the new path, the move fails and asks you " +
    "to pick a different name. It moves the file, so the old path no longer holds it.",
  inputSchema: {
    bucket: z.string().describe("The bucket the file lives in."),
    from_path: z
      .string()
      .describe("Current path of the file, e.g. 'draft.png' or 'logos/draft.png'."),
    to_path: z
      .string()
      .describe("New path/name for the file, e.g. 'logos/final.png'. Must not already exist."),
  },
  async run(args): Promise<string> {
    const from = args.from_path.replace(/^\/+/, "");
    const to = args.to_path.replace(/^\/+/, "");

    if (from === to) {
      throw new FriendlyError("The new path is the same as the current one — nothing to move.");
    }

    // Guardrail: refuse if the destination is occupied.
    if (await destinationExists(args.bucket, to)) {
      throw new FriendlyError(
        `A file already exists at "${to}" in bucket "${args.bucket}". Choose a different name — this plugin never overwrites existing files.`,
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.storage.from(args.bucket).move(from, to);
    if (error) {
      throw new FriendlyError(toFriendlyMessage(error, { bucket: args.bucket, path: from }));
    }

    return `Moved "${from}" to "${to}" in bucket "${args.bucket}". The file is now only at the new path.`;
  },
});
