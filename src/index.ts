#!/usr/bin/env node
/**
 * Supabase Storage MCP server (stdio).
 *
 * Exposes seven STORAGE-ONLY, ADDITIVE-ONLY tools for a Supabase Storage project.
 * There is deliberately NO database access and NO destructive operation anywhere in this
 * server — see the plugin README and sdd-plus specs for the guardrail rationale.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { toFriendlyMessage } from "./errors.js";
import type { RegisteredTool } from "./tools/tool.js";
import listBuckets from "./tools/listBuckets.js";
import createBucket from "./tools/createBucket.js";
import uploadFile from "./tools/uploadFile.js";
import listFiles from "./tools/listFiles.js";
import getSignedUrl from "./tools/getSignedUrl.js";
import getPublicUrl from "./tools/getPublicUrl.js";
import moveFile from "./tools/moveFile.js";

// Load credentials from the plugin's own .env (dist/index.js -> ../.env), regardless of
// the working directory the MCP host launches us from.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "..", ".env") });

const TOOLS: RegisteredTool[] = [
  listBuckets,
  createBucket,
  uploadFile,
  listFiles,
  getSignedUrl,
  getPublicUrl,
  moveFile,
];

async function main(): Promise<void> {
  const server = new McpServer({
    name: "supabase-storage",
    version: "1.0.0",
  });

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: unknown) => {
        try {
          const text = await tool.run(args);
          return { content: [{ type: "text" as const, text }] };
        } catch (err) {
          // Never leak a raw stack trace or the service key to the user — always friendly.
          return {
            content: [{ type: "text" as const, text: toFriendlyMessage(err) }],
            isError: true,
          };
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs (stdout is the MCP channel).
  console.error("supabase-storage MCP server ready (7 storage tools, additive-only).");
}

main().catch((err) => {
  console.error("Fatal: supabase-storage MCP server failed to start:", err);
  process.exit(1);
});
