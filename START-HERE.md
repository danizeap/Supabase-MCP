# Start here 👋

This folder is a small tool that lets you **create storage buckets and upload media**
(images, video, design files) to Supabase just by chatting with Claude — no dashboard needed.

Everything is already set up for you. You only need to do a quick one-time setup.

## One-time setup (about 3 minutes)

**1. Install Node.js** — this quietly runs the tool in the background.
   - Go to **https://nodejs.org**, download the big green **"LTS"** button, and run the installer.
   - Click **Next / Continue** through it and finish. You never have to open it again.

**2. Open THIS folder in Claude Code.**
   - If you're not sure how, ask whoever sent you this folder to show you once — it's a single step.

**3. Approve the tool the first time.**
   - Claude will ask to approve something called **`supabase-storage`**. Click **Approve / Yes**.
   - You won't be asked again.

That's it. You're ready.

## How to use it

**Easiest:** type this and press enter —

```
/upload-media
```

Claude will check the connection, show what's there, and walk you through everything.

**If that doesn't do anything,** just paste this message to Claude instead:

```
This folder is a tool that lets me manage our Supabase media storage by chatting with you, using
tools called supabase-storage. Please help me, and do the technical parts for me — I'm not technical.

1. First run list_buckets to check the connection works and show me the storage buckets we have.
   If it gives a credentials or connection error, tell me to contact whoever set up this folder —
   I can't fix that myself.
2. Then ask me what I want to do (usually: upload an image, video, or design file, or get a
   shareable link for one).

Keep in mind: bucket names must start with marketing-, brand-, campaigns-, media-, or assets-
(lowercase with dashes) — fix my name if it doesn't fit. Nothing here can delete or overwrite files,
so it's safe. To share a file: temporary link if it's private, permanent link if it's public.

Start by running list_buckets.
```

Either way, then just talk to Claude in plain language:
- *"Make a new bucket for the summer campaign."*
- *"Upload C:\Users\me\Pictures\logo.png to the brand-logos bucket."*
- *"Give me a shareable link for logo.png."*

## Good to know

- **You can't break anything.** This tool cannot delete or overwrite files — only add new ones.
- **Bucket names** must start with `marketing-`, `brand-`, `campaigns-`, `media-`, or `assets-`
  (lowercase, with dashes). Claude will remind you if a name doesn't fit.
- **Private vs public:** private files are shared with a temporary link; public files (like logos)
  get a permanent web link. When unsure, private is the safe default.
- **You don't need to touch any settings or a ".env" file** — it's already configured. If Claude ever
  says it can't connect or can't authenticate, that's a setup thing: just tell whoever sent you the folder.
