import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DB: z.unknown() as z.ZodType<D1Database>,
  VPC_SERVICE: z.unknown() as z.ZodType<Fetcher>,
  RABBITMQ_USER: z.string(),
  RABBITMQ_PASSWORD: z.string(),
  JWT_SECRET: z.string(),
  CORS_ORIGIN: z.string().default("*"),
  SKIP_JOBS: z.union([z.boolean(), z.string()]).transform((val) => {
    if (typeof val === "boolean")
      return val;
    return val === "true";
  }).default(true),
});

export type Env = z.infer<typeof EnvSchema>;
