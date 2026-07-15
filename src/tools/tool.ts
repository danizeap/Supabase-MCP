/**
 * Tiny helper that gives each tool module full type-safety on its handler arguments
 * (inferred from its zod input schema) while presenting a uniform, type-erased shape to
 * the server registry in index.ts.
 */

import type { z, ZodRawShape } from "zod";

/** Type-erased tool as seen by the registry. */
export interface RegisteredTool {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  /** Returns the plain-text result shown to the user. Throw FriendlyError for expected failures. */
  run: (args: any) => Promise<string>;
}

/**
 * Define a tool with a zod input schema. The `run` handler receives fully-typed args.
 */
export function defineTool<Shape extends ZodRawShape>(def: {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  run: (args: z.infer<z.ZodObject<Shape>>) => Promise<string>;
}): RegisteredTool {
  return def as unknown as RegisteredTool;
}
