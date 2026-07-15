/**
 * Tiny helper that gives each tool module full type-safety on its handler arguments
 * (inferred from its zod input schema) while presenting a uniform, type-erased shape to
 * the server registry in index.ts.
 */
/**
 * Define a tool with a zod input schema. The `run` handler receives fully-typed args.
 */
export function defineTool(def) {
    return def;
}
