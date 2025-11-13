import type { Env } from "@/utils/env";
import { OpenAPIHono } from "@hono/zod-openapi";

export function createRouter() {
  return new OpenAPIHono<{ Bindings: Env }>({ strict: false });
}
