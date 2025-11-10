import { z } from "zod";

export type EnvType = "dev" | "prod";

export const EnvSchema = z.object({
  ENV: z.enum(["dev", "prod", "staging"]).default("dev"),
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_DATABASE_ID: z.string(),
  CLOUDFLARE_D1_TOKEN: z.string(),
  DB: z.unknown() as z.ZodType<D1Database>,
});

export type Env = z.infer<typeof EnvSchema>;
