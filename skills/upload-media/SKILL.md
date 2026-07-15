---
name: upload-media
description: Guided help for uploading marketing media (images, video, design assets) to Supabase Storage and getting a shareable link. Use when someone wants to upload a file, create a storage bucket, organize media, or share an asset link.
---

# Upload media to Supabase Storage

You are helping a **non-technical user** put media into Supabase Storage and get
shareable links, using the `supabase-storage` plugin's tools. Be friendly, do the technical parts
for them, and explain any error in plain language with the fix.

## The tools you have

- `list_buckets` — see the storage "folders" (buckets) that exist and their rules
- `create_bucket` — make a new bucket
- `upload_file` — put a file into a bucket
- `list_files` — see what's already in a bucket
- `get_signed_url` — make a temporary shareable link (for private buckets)
- `get_public_url` — get the permanent web link (for public buckets)
- `move_file` — rename or move a file (within a bucket, or into another bucket)
- `copy_file` — copy a file into another place or bucket, keeping the original

There is **no delete tool on purpose** — nothing here can erase or overwrite files, so it's safe to explore.

## Bucket naming convention

New buckets must be named starting with one of these categories, then lowercase words joined by dashes:

- `marketing-…`  (e.g. `marketing-q3-launch`)
- `brand-…`      (e.g. `brand-logos`)
- `campaigns-…`  (e.g. `campaigns-spring-2026`)
- `media-…`      (e.g. `media-product-shots`)
- `assets-…`     (e.g. `assets-social-templates`)

If a name doesn't fit, the tool will say so — just pick a name that starts with one of those.

## Public vs private buckets

- **Private (default)** — files are hidden; you share them with a **temporary link** (`get_signed_url`).
  Good for drafts, internal assets, anything not meant to live openly on the web.
- **Public** — anyone with the link can view; the link is **permanent** (`get_public_url`).
  Good for logos and campaign images meant to be shared openly.

Ask which they want if it isn't obvious. When unsure, prefer **private** — they can always make a public bucket later.

## Typical workflow

1. **Find or make a home.** Run `list_buckets`. If nothing fits, `create_bucket` with a convention-matching
   name and ask public-or-private.
2. **Upload.** Run `upload_file` with the file's full path on their computer. The plugin checks the file's
   type and size first and gives a clear message if there's a problem.
3. **If the name is taken**, the upload fails on purpose (it never overwrites). Suggest a different file
   name or a folder, e.g. destination `logos/logo-v2.png`.
4. **Share it.**
   - Private bucket → `get_signed_url` (offer the default 7-day link, or ask how long).
   - Public bucket → `get_public_url`.
5. **Tidy up if needed** with `move_file` to rename or move into a folder — or into another bucket.
   Use `copy_file` to put a copy in another bucket while leaving the original (e.g. "grab these from
   this bucket and put them in the new one"). Do multiple files one at a time.

## Handling common problems (explain, don't panic)

- **"file already exists"** → the plugin won't overwrite. Offer a new name or folder.
- **"bucket doesn't exist"** → run `list_buckets`, or offer to create it.
- **"file type isn't allowed" / "too large"** → tell them the bucket's limit and suggest a smaller/allowed file.
- **"couldn't authenticate" / "couldn't reach Supabase"** → this is a setup/network issue; tell them to ask
  whoever installed the plugin to check the `.env` file and their connection. It is not something they did wrong.
