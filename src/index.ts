import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "./env";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import packageJson from "../package.json" assert { type: "json" };
import example from "./routes/example.index";

export function createRouter() {
  return new OpenAPIHono<{ Bindings: Env }>({ strict: false });
}

const app = createRouter();

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
});

app.doc("/docs", {
  openapi: "3.0.0",
  info: {
    title: "Clipsi API",
    version: packageJson.version,
    description: "API for Clipsi web application",
  },
});

app.get("/", Scalar({
  url: "/docs",
  theme: "moon",
  pageTitle: "Clipsi API Documentation",
  layout: "classic",
}));

const routes = [
  example,
];

routes.forEach((router) => {
  app.route("/", router);
});

export default app;
