import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { Env } from "./env";

import { OpenAPIHono } from "@hono/zod-openapi";

const app = new OpenAPIHono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.notFound((c) => {
  return c.json({
    message: `Not Found - ${c.req.path}`,
  }, 404);
});

app.onError((err, c) => {
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
      stack: env.ENV === "prod" ? undefined : err.stack,
    },
    statusCode,
  );
},
);

export default app;
