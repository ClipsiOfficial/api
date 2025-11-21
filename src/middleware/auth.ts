import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "@/utils/env";
import { jwt } from "hono/jwt";

/**
 * JWT authentication middleware
 * Bypasses verification in development mode
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c: Context<{ Bindings: Env }>, next) => {
    // Bypass JWT verification in development mode
    if (c.env.NODE_ENV === "development") {
      return next();
    }

    const jwtMiddleware = jwt({
      secret: c.env.JWT_SECRET,
    });
    return jwtMiddleware(c, next);
  };
}
