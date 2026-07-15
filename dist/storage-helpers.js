/**
 * Small shared helpers for the copy/move tools. Kept in one place so both enforce the
 * no-overwrite guardrail identically.
 */
import { toFriendlyMessage, FriendlyError } from "./errors.js";
/** Split a bucket path into its parent folder and file name. */
export function splitPath(path) {
    const clean = path.replace(/^\/+/, "");
    const idx = clean.lastIndexOf("/");
    if (idx === -1)
        return { parent: "", name: clean };
    return { parent: clean.slice(0, idx), name: clean.slice(idx + 1) };
}
/**
 * Check whether a path already holds a file in the given bucket, so copy/move can refuse
 * rather than overwrite. Throws a friendly error if the lookup itself fails.
 */
export async function objectExists(supabase, bucket, path) {
    const { parent, name } = splitPath(path);
    const { data, error } = await supabase.storage
        .from(bucket)
        .list(parent, { search: name, limit: 100 });
    if (error)
        throw new FriendlyError(toFriendlyMessage(error, { bucket, path }));
    return Boolean(data?.some((item) => item.name === name && item.metadata?.size != null));
}
