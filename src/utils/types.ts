import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Env } from "../env";

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, { Bindings: Env }>;
