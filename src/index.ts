import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "./utils/env";
import { Scalar } from "@scalar/hono-api-reference";
import { jwt } from "hono/jwt";
import packageJson from "../package.json" assert { type: "json" };
import example from "./routes/example.index";
import { createRouter, validateEnv } from "./utils/functions";

const app = createRouter();

// Validate and parse environment variables for all routes
app.use("*", validateEnv());

const publicRoutes = [
  example,
  // Login, register, health, and other public routers can be added here ...
];

const privateRoutes: typeof publicRoutes = [
  // Add private routers here
];

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
      stack: env.NODE_ENV === "production" ? undefined : err.stack,
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

publicRoutes.forEach((router) => {
  app.route("/", router);
});

app.use("*", (c, next) => {
  // Bypass JWT verification in development mode
  if (c.env.NODE_ENV === "development") {
    return next();
  }

  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

privateRoutes.forEach((router) => {
  app.route("/", router);
});

export default app;
