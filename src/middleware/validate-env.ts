import type { Context } from "hono";
import type { Env } from "@/utils/env";
import { EnvSchema } from "@/utils/env";

/**
 * Middleware to parse and validate environment variables
 * This ensures SKIP_JOBS and other env vars are properly typed
 */
export function validateEnv() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const parsed = EnvSchema.parse(c.env);
    // Replace c.env with the parsed and validated version
    c.env = parsed as Env;
    await next();
  };
}
