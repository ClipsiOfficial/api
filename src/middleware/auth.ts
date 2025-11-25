import type { Context, MiddlewareHandler } from "hono";
import type { Env } from "@/utils/env";
import { jwt } from "hono/jwt";

/**
 * JWT authentication middleware
 */
export function authMiddleware(): MiddlewareHandler {
  return async (c: Context<{ Bindings: Env }>, next) => {
    const jwtMiddleware = jwt({
      secret: c.env.JWT_SECRET,
    });
    return jwtMiddleware(c, next);
  };
}
