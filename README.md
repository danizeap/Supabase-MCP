# Supabase Storage plugin for Claude

A Claude Code plugin that lets you **create storage buckets and upload media** (images, video,
audio, PDFs, design assets) to Supabase — just by chatting with Claude. It fills the gap left by
the official Supabase MCP, which has no Storage bucket API.

**Storage-only and additive-only by design:**

- 🚫 No delete anything. There is no tool to delete, remove, or empty a bucket or file.
- 🚫 No overwrite. Uploads and moves never replace an existing file — a name clash fails cleanly.
- 🚫 No database access. The plugin exposes storage tools only; it cannot read or change your data.

---

## Part 1 — Setup (for whoever installs it)

### What you need

- Node.js 18 or newer (`node --version`).
- Access to your Supabase project in the Supabase dashboard.

### Step 1 — Get your two credentials from Supabase

In the [Supabase dashboard](https://supabase.com/dashboard), open the project, then:

1. **Project URL** — Project Settings → **Data API** → *Project URL*
   (looks like `https://abcdefghijklmno.supabase.co`).
2. **Service role key** — Project Settings → **API Keys** → reveal the **`service_role`** key.

> ⚠️ **The service role key is sensitive — treat it like a password.**
> It can access the whole project, so never commit it, paste it in chat, or share it.
> This plugin only ever uses it for Storage operations and exposes no database tools, but the key
> itself is still powerful. Keep it in the `.env` file (which is gitignored) and nowhere else.

### Step 2 — Configure the plugin

1. Copy the template to a real env file, in the plugin folder:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and paste your two values:

   ```
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

### Step 3 — Install and build

The plugin ships with a prebuilt `dist/`, so if you just cloned it you can usually skip straight to
installing it in Claude. If you edited the source (or want to be sure), run:

```bash
npm install     # installs dependencies and builds dist/ automatically
npm test        # optional: runs the guardrail tests (should print "pass 10")
```

### Step 4 — Install the plugin in Claude Code

Add this folder as a plugin (via your Claude Code plugin marketplace/config). The plugin's
`.claude-plugin/plugin.json` registers a local stdio MCP server that runs `dist/index.js`. Once
installed, Claude will have seven `supabase-storage` tools and the `/upload-media` guide available.

To verify quickly from a terminal, you can start the server directly — it should print
`supabase-storage MCP server ready`:

```bash
npm start
```

### The seven tools

| Tool | What it does |
| --- | --- |
| `list_buckets` | List buckets with their public/private, size limit, and allowed types |
| `create_bucket` | Create a bucket (naming convention enforced; defaults to private, 50MB, common media) |
| `upload_file` | Upload a local file (validates type + size first; never overwrites) |
| `list_files` | List files in a bucket (optionally in a folder), with sizes and dates |
| `get_signed_url` | Make a temporary shareable link (default 7 days) — works for private buckets |
| `get_public_url` | Get the permanent public link — for public buckets |
| `move_file` | Rename or move a file within a bucket (never overwrites) |

### Bucket naming convention

Enforced in code. A bucket name must start with an allowed category prefix, then lowercase words
joined by dashes:

```
^(marketing|brand|campaigns|media|assets)(-[a-z0-9]+)+$
```

Examples: `marketing-q3-launch`, `brand-logos`, `campaigns-spring-2026`, `media-product-shots`,
`assets-social-templates`.

To add or change the allowed prefixes, edit `ALLOWED_BUCKET_PREFIXES` in
[`src/config.ts`](src/config.ts) and run `npm run build`.

---

## Part 2 — How to use it (for the marketing team)

You don't need to know any of the technical stuff. Just talk to Claude. Try the `/upload-media`
command, or say things like:

- **"What storage buckets do we have?"** → Claude lists them.
- **"Make a new bucket for the Q3 launch."** → Claude creates `marketing-q3-launch` (it'll ask if it
  should be private or public).
- **"Upload C:\Users\me\Pictures\hero.png to the marketing-q3-launch bucket."** → Claude uploads it and
  tells you where it landed.
- **"Give me a shareable link for hero.png."** → Claude makes a link (a temporary one for private
  buckets, valid 7 days by default; a permanent one for public buckets).
- **"Rename hero.png to hero-final.png."** → Claude moves it.

Good to know:

- **Nothing you do here can delete or overwrite a file.** If a name is already taken, Claude will
  ask you to pick a different one. Explore freely.
- **Private vs public:** private files are shared with a temporary link; public files (like logos)
  get a permanent web link. When in doubt, private is the safe default.
- **If something doesn't work,** Claude will explain it in plain language — e.g. "that file type
  isn't allowed here" or "that bucket doesn't exist yet." If it mentions credentials or the network,
  that's a setup issue — tell whoever installed the plugin; it's not something you did wrong.

---

## Part 3 — Quick test checklist (for the installer, after setup)

Run through this once with Claude to confirm everything works end to end:

1. **Create a bucket** — ask Claude to create `media-test-bucket` (private). ✅ It's created.
2. **Upload an image** — ask Claude to upload a small image to it. ✅ It returns the stored path and
   offers a signed link.
3. **List files** — ask Claude to list files in `media-test-bucket`. ✅ Your image appears with its
   size and date.
4. **Signed URL** — ask for a shareable link to the image. ✅ You get a URL; opening it shows the image.
5. **Duplicate upload fails** — upload the *same* file to the *same* path again. ✅ It fails with
   "that name is already taken — choose a different name" (nothing is overwritten).
6. **Bad bucket name fails** — ask Claude to create a bucket called `TestBucket` or `random-name`.
   ✅ It's refused with an explanation of the naming rule.

If all six behave as described, the plugin is working.

---

## How it's built

- TypeScript stdio MCP server using `@modelcontextprotocol/sdk` and `@supabase/supabase-js`.
- Source in [`src/`](src/) (one file per tool under `src/tools/`), compiled to `dist/`.
- Guardrails live in code: naming regex and defaults in [`src/config.ts`](src/config.ts); client-side
  validation in [`src/validation.ts`](src/validation.ts); friendly error mapping in
  [`src/errors.ts`](src/errors.ts).
- `npm test` runs guardrail tests, including a structural check that no destructive Storage call
  (`.remove`, `deleteBucket`, `emptyBucket`) and no `upsert: true` exists anywhere in the build.

> This is an **interim, disposable** tool and may be replaced by a more complete solution later.
