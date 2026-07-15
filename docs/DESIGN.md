# Design notes

Design rationale for the Supabase Storage MCP plugin. For setup and usage, see the
[README](../README.md).

## Goal

Let a non-technical user create Supabase Storage buckets and upload media (images, video, audio,
PDFs, design assets) conversationally through Claude — without using the dashboard, touching the
database, or risking data loss. The official Supabase MCP covers SQL, migrations, and edge functions
but has **no Storage bucket API**, so this plugin fills that gap.

It is intended as a simple, self-contained, interim tool.

## Principles (hard guardrails)

These are enforced in code, not just documented:

- **Additive-only — no delete.** No tool performs `remove`, `emptyBucket`, `deleteBucket`, or any
  destructive operation. There is a structural test asserting none exist in the build.
- **No overwrite.** All uploads use `upsert: false`; a name collision fails with a clear message.
  `move_file` refuses if the destination already exists.
- **Storage-only.** The plugin exposes zero database tools and never issues SQL. Its entire surface
  is the Supabase Storage API.
- **Naming convention.** Buckets must match `^(marketing|brand|campaigns|media|assets)(-[a-z0-9]+)+$`.
  The allowed prefixes live in an extensible constant (`src/config.ts`).
- **Friendly validation first.** MIME type and file size are checked client-side before any API call,
  so a non-technical user gets immediate, actionable errors.

## Key decision: service role key, not S3 access keys

The plugin authenticates with a Supabase **service role key** via the native
`@supabase/supabase-js` Storage API, rather than Supabase's S3-compatible access keys.

**Why.** Supabase's S3-compatible `CreateBucket` cannot set the bucket configuration this plugin
needs — public/private, file size limit, or allowed MIME types — and cannot create a public bucket
at all. Those settings exist only in the native Storage API, and the S3 access key cannot
authenticate against that API. So the native Storage API + service role key is the only route that
satisfies `create_bucket`.

**Trade-off and mitigation.** A service role key can technically reach the database. That risk is
neutralized at the plugin boundary: the tool surface is storage-only (no database tools exist in the
code), the key is read from a gitignored `.env`, and the README flags it as sensitive with
least-privilege guidance.

## Other decisions

- **Prebuilt `dist/` is committed.** So a non-technical installer needs no build step — the plugin
  runs `dist/index.js` directly. Rebuild with `npm run build` after editing `src/`.
- **`zod` pinned to v3.** Well-tested with the MCP SDK's `registerTool` schema API; avoids v4 drift.
- **Lazy client creation.** The Supabase client is created on first use so a missing/malformed `.env`
  yields a friendly error at call time instead of crashing the server on startup.

## The seven tools

| Tool | Purpose |
| --- | --- |
| `list_buckets` | List buckets with public/private, size limit, allowed types |
| `create_bucket` | Create a bucket (naming enforced; defaults to private, 50MB, common media) |
| `upload_file` | Upload a local file (validates type + size first; never overwrites) |
| `list_files` | List files in a bucket/folder, with sizes and timestamps |
| `get_signed_url` | Time-limited shareable link (default 7 days) — for private buckets |
| `get_public_url` | Permanent public link — for public buckets |
| `move_file` | Rename/move within a bucket (never overwrites) |

## Architecture

```
src/
  index.ts        MCP server entry — registers the 7 tools over stdio, friendly-error wrapper
  config.ts       allowed prefixes, naming regex, media + size defaults
  supabase.ts     lazy service-role client (credentials from env)
  validation.ts   bucket-name / MIME / size validators
  errors.ts       maps Supabase + network errors to plain-language messages
  tools/          one module per tool
skills/upload-media/  guided workflow for the end user
test/             guardrail tests (naming, validation, and structural no-delete/no-overwrite checks)
```

Compiled to `dist/`; the plugin's `.claude-plugin/plugin.json` registers a stdio MCP server that
runs `dist/index.js`.
