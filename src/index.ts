import type { Env as BindingsEnv, Env } from "./utils/env";
import { Scalar } from "@scalar/hono-api-reference";
import packageJson from "../package.json" assert { type: "json" };
import { authMiddleware, corsMiddleware, errorHandler, notFoundHandler, validateEnv } from "./middleware";
import { privateKeywordRouter, publicKeywordRouter } from "./routes/keywords/keywords.index";
import { privateNewsRouter } from "./routes/news/news.index";
import { privateProjectRouter, publicProjectRouter } from "./routes/projects/projects.index";
import { privateUserRouter, publicUserRouter } from "./routes/users/users.index";
import handleSchedulers from "./services/scheduler";
import { EnvSchema } from "./utils/env";
import { createRouter } from "./utils/functions";

const app = createRouter();

// Validate and parse environment variables for all routes
app.use("*", validateEnv());

app.use("*", corsMiddleware());

const publicRoutes = [
  publicUserRouter,
  publicProjectRouter,
  publicKeywordRouter,
  // Login, register, health, and other public routers can be added here ...
];

const privateRoutes: typeof publicRoutes = [
  privateUserRouter,
  privateProjectRouter,
  privateKeywordRouter,
  privateNewsRouter,
  // Add private routers here
];

app.notFound(notFoundHandler);

app.onError(errorHandler);

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
  theme: "elysiajs",
  pageTitle: "Clipsi API Documentation",
  layout: "classic",
}));

publicRoutes.forEach((router) => {
  app.route("/", router);
});

app.use("*", authMiddleware());

privateRoutes.forEach((router) => {
  app.route("/", router);
});

export default {
  // The Hono app handles regular HTTP requests
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: BindingsEnv, ctx: ExecutionContext) {
    const validatedEnv: Env = EnvSchema.parse(env);
    ctx.waitUntil(handleSchedulers(controller, validatedEnv));
  },
};
