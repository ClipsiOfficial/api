import { z } from "zod";

export type EnvType = "dev" | "prod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DB: z.unknown() as z.ZodType<D1Database>,
});

export type Env = z.infer<typeof EnvSchema>;
