import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

export interface Env {
  DB: D1Database;
}

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const _db = drizzle(env.DB);
    return app.fetch(req, env, ctx);
  },
};
