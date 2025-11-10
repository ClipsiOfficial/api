import type { Env } from "../env";

import { drizzle } from "drizzle-orm/d1";

export function getDB(env: Env) {
  return drizzle(env.DB);
}
