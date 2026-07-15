/**
 * Lazy Supabase client factory.
 *
 * The client is created on first use (not at import time) so that a missing or
 * malformed `.env` produces a friendly, actionable error at call time rather than
 * crashing the whole MCP server on startup.
 *
 * Credentials come from environment variables loaded from the plugin's `.env`
 * (see index.ts). We use the SERVICE ROLE key with the native Storage API — this is
 * the only route that can configure buckets (public/private, size limit, MIME types).
 * The key is powerful, so this plugin deliberately exposes STORAGE tools only and
 * never touches the database.
 */
import { createClient } from "@supabase/supabase-js";
let cachedClient = null;
/**
 * Thrown when required credentials are missing. Carries a plain-language message
 * that the error mapper surfaces directly to the user.
 */
export class MissingCredentialsError extends Error {
    constructor(message) {
        super(message);
        this.name = "MissingCredentialsError";
    }
}
/**
 * Returns a shared Supabase client, creating it on first call.
 * @throws MissingCredentialsError if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is absent.
 */
export function getSupabase() {
    if (cachedClient)
        return cachedClient;
    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceKey) {
        const missing = [];
        if (!url)
            missing.push("SUPABASE_URL");
        if (!serviceKey)
            missing.push("SUPABASE_SERVICE_ROLE_KEY");
        throw new MissingCredentialsError(`The plugin is missing its Supabase credentials (${missing.join(" and ")}). Ask whoever set up this plugin to copy ".env.example" to ".env" and fill in the values from the Supabase dashboard (Project Settings).`);
    }
    cachedClient = createClient(url, serviceKey, {
        auth: {
            // This is a server-side, machine-to-machine client. No session persistence,
            // no token auto-refresh, no URL session detection.
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
    return cachedClient;
}
