import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "@/utils/env";
import { cors } from "hono/cors";

/**
 * CORS middleware
 * Configures Cross-Origin Resource Sharing based on environment variables.
 */
export function corsMiddleware(): MiddlewareHandler {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const corsHandler = cors({
      origin: (origin) => {
        if (c.env.CORS_ORIGIN === "*") {
          return origin;
        }
        return c.env.CORS_ORIGIN;
      },
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS", "PATCH", "DELETE"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    });
    return corsHandler(c, next);
  };
}
