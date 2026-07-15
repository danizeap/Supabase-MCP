/**
 * Guardrail tests — prove the hard, non-negotiable rules hold, without needing a live
 * Supabase project. Run with `npm test` (uses Node's built-in test runner).
 *
 * These test the compiled output in dist/, so run `npm run build` first (npm test does).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mod = (rel) => pathToFileURL(resolve(root, rel)).href;

const { BUCKET_NAME_PATTERN, DEFAULT_FILE_SIZE_LIMIT_BYTES, ALLOWED_BUCKET_PREFIXES } =
  await import(mod("dist/config.js"));
const { validateBucketName, mimeAllowed, validateUpload, guessMimeType, formatBytes } =
  await import(mod("dist/validation.js"));
const { FriendlyError } = await import(mod("dist/errors.js"));

test("bucket naming convention accepts valid kebab-case names with allowed prefixes", () => {
  for (const name of ["marketing-q3-launch", "brand-logos", "campaigns-2026-spring", "media-shots", "assets-social-01"]) {
    assert.ok(BUCKET_NAME_PATTERN.test(name), `${name} should be valid`);
    assert.doesNotThrow(() => validateBucketName(name));
  }
});

test("bucket naming convention rejects bad names with a FriendlyError", () => {
  for (const name of ["MyBucket", "random-name", "marketing", "brand_logos", "Marketing-x", "campaigns-", "-media-x", "media--x", "assets-ABC"]) {
    assert.ok(!BUCKET_NAME_PATTERN.test(name), `${name} should be invalid`);
    assert.throws(() => validateBucketName(name), FriendlyError, `${name} should throw`);
  }
});

test("allowed prefixes are exactly the documented five", () => {
  assert.deepEqual([...ALLOWED_BUCKET_PREFIXES].sort(), ["assets", "brand", "campaigns", "marketing", "media"]);
});

test("MIME allow-list matches wildcards, exacts, and null (no restriction)", () => {
  assert.ok(mimeAllowed("image/png", ["image/*"]));
  assert.ok(mimeAllowed("application/pdf", ["image/*", "application/pdf"]));
  assert.ok(mimeAllowed("anything/here", null)); // null => unrestricted
  assert.ok(mimeAllowed("anything/here", [])); // empty => unrestricted
  assert.ok(!mimeAllowed("video/mp4", ["image/*", "application/pdf"]));
  assert.ok(!mimeAllowed("image/png", ["video/*"]));
});

test("upload validation rejects disallowed MIME and oversize files before any API call", () => {
  const bucket = { name: "media-x", allowedMimeTypes: ["image/*"], fileSizeLimitBytes: 1024 };
  assert.throws(() => validateUpload({ mime: "video/mp4", sizeBytes: 10 }, bucket), FriendlyError);
  assert.throws(() => validateUpload({ mime: "image/png", sizeBytes: 2048 }, bucket), FriendlyError);
  assert.doesNotThrow(() => validateUpload({ mime: "image/png", sizeBytes: 512 }, bucket));
});

test("upload validation treats null size limit as unrestricted", () => {
  const bucket = { name: "media-x", allowedMimeTypes: null, fileSizeLimitBytes: null };
  assert.doesNotThrow(() => validateUpload({ mime: "anything/here", sizeBytes: 9e9 }, bucket));
});

test("MIME guessing covers common media and falls back to octet-stream", () => {
  assert.equal(guessMimeType("logo.PNG"), "image/png");
  assert.equal(guessMimeType("/a/b/clip.mp4"), "video/mp4");
  assert.equal(guessMimeType("C:/x/song.mp3"), "audio/mpeg");
  assert.equal(guessMimeType("doc.pdf"), "application/pdf");
  assert.equal(guessMimeType("mystery.xyz"), "application/octet-stream");
});

test("defaults: 50MB size limit and human-readable byte formatting", () => {
  assert.equal(DEFAULT_FILE_SIZE_LIMIT_BYTES, 50 * 1024 * 1024);
  assert.equal(formatBytes(DEFAULT_FILE_SIZE_LIMIT_BYTES), "50 MB");
  assert.equal(formatBytes(512), "512 B");
});

test("STRUCTURAL GUARDRAIL: no destructive Storage calls anywhere in the built server", () => {
  // Walk dist/ and assert no source uses delete/remove/emptyBucket/deleteBucket or upsert:true.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(".js")) continue;
      const src = readFileSync(full, "utf8");
      // Supabase destructive Storage APIs and overwrite flag.
      for (const bad of [".remove(", "deleteBucket(", "emptyBucket(", "upsert: true", "upsert:true"]) {
        if (src.includes(bad)) offenders.push(`${entry.name}: ${bad}`);
      }
    }
  };
  walk(resolve(root, "dist"));
  assert.deepEqual(offenders, [], `Found destructive/overwrite usage: ${offenders.join(", ")}`);
});

test("STRUCTURAL GUARDRAIL: uploads and moves are explicitly non-overwriting", () => {
  const upload = readFileSync(resolve(root, "dist/tools/uploadFile.js"), "utf8");
  assert.ok(/upsert:\s*false/.test(upload), "upload_file must set upsert:false");
});
