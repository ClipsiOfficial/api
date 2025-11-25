import { Scalar } from "@scalar/hono-api-reference";
import packageJson from "../package.json" assert { type: "json" };
import { authMiddleware, errorHandler, notFoundHandler, validateEnv } from "./middleware";
import { privateUserRouter, publicUserRouter } from "./routes/users/users.index";
import { createRouter } from "./utils/functions";

const app = createRouter();

// Validate and parse environment variables for all routes
app.use("*", validateEnv());

const publicRoutes = [
  publicUserRouter,
  // Login, register, health, and other public routers can be added here ...
];

const privateRoutes: typeof publicRoutes = [
  privateUserRouter,
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

export default app;
