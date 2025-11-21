import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "@/utils/env";

/**
 * Global error handler
 * Returns error details with stack trace in development mode
 */
export const errorHandler: ErrorHandler = (err, c) => {
  const currentStatus = "status" in err
    ? err.status
    : c.newResponse(null).status;
  const statusCode = currentStatus !== 200
    ? (currentStatus as ContentfulStatusCode)
    : 500;

  const env = c.env as Env;
  return c.json(
    {
      message: err.message,
      stack: env.NODE_ENV === "production" ? undefined : err.stack,
    },
    statusCode,
  );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json({
    message: `Not Found - ${c.req.path}`,
  }, 404);
};
