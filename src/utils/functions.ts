import type { Env } from "@/env";
import { OpenAPIHono } from "@hono/zod-openapi";

export function createRouter() {
  return new OpenAPIHono<{ Bindings: Env }>({ strict: false });
}
