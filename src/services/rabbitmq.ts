import type { Env } from "@/utils/env";
import { z } from "zod";

// Available queue names
export type QueueName = "news" | "rss_atom" | "searcher";

// Schemas for different message types by queue
export const NewsMessageSchema = z.object({
  keyword_id: z.number().refine(id => id > 0, { message: "keyword_id must be a positive integer" }),
  rss_atom_id: z.number().refine(id => id > 0, { message: "rss_atom_id must be a positive integer" }).optional(),
  url: z.url({ message: "url must be a valid URL" }),
});

export const RSSMessageSchema = z.object({
  rss_atom_id: z.number().refine(id => id > 0, { message: "rss_atom_id must be a positive integer" }),
  feed_url: z.url({ message: "feed_url must be a valid URL" }),
  keywords: z.array(z.string().min(1, { message: "keyword cannot be empty" })),
});

export const SearcherMessageSchema = z.object({
  project_id: z.number().refine(id => id > 0, { message: "project_id must be a positive integer" }),
  topic: z.string().min(1, { message: "topic cannot be empty" }),
  keyword_id: z.number().refine(id => id > 0, { message: "keyword_id must be a positive integer" }),
  keyword: z.string().min(1, { message: "keyword cannot be empty" }),
  searches: z.number().refine(count => count > 0, { message: "searches must be a positive integer" }).default(0),
});

// Map queue name to its schema so we validate against the specific queue schema
export const QueueSchemaMap: Record<QueueName, z.ZodTypeAny> = {
  news: NewsMessageSchema,
  rss_atom: RSSMessageSchema,
  searcher: SearcherMessageSchema,
};

export type Message = z.infer<typeof NewsMessageSchema> | z.infer<typeof RSSMessageSchema> | z.infer<typeof SearcherMessageSchema>;

// RabbitMQ response schema
const PublishResponseSchema = z.object({
  routed: z.boolean(),
});

// Type-safe message types for each queue
interface QueueMessages {
  news: z.infer<typeof NewsMessageSchema>;
  rss_atom: z.infer<typeof RSSMessageSchema>;
  searcher: z.infer<typeof SearcherMessageSchema>;
}

interface PublishOptions {
  /**
   * The exchange to publish to (default: 'amq.default')
   */
  exchange?: string;
  /**
   * Additional properties for the message
   */
  properties?: Record<string, unknown>;
}

/**
 * Publishes a message to a RabbitMQ queue in a type-safe manner
 *
 * @param env - Cloudflare environment bindings (includes VPC_SERVICE)
 * @param queue - Target queue name
 * @param message - Message to send (validated against queue schema)
 * @param options - Additional publish options
 * @returns Promise that resolves to true if the message was routed successfully
 * @throws Error if publishing fails or message is not routed
 *
 * @example
 * ```ts
 * await publishToQueue(c.env, "news", {
 *   message: "Breaking news!",
 * });
 * ```
 */
export async function publishToQueue<Q extends QueueName>(
  env: Env,
  queue: Q,
  message: QueueMessages[Q],
  options: PublishOptions = {},
): Promise<boolean> {
  // Check if jobs are skipped
  if (env.SKIP_JOBS) {
    console.warn(`[SKIP_JOBS] Skipping job to queue "${queue}":`, message);
    return true;
  }

  // Validate against the specific queue schema
  const schema = QueueSchemaMap[queue as QueueName];
  if (!schema)
    throw new Error(`No schema defined for queue: ${queue}`);
  const validatedMessage = schema.parse(message as unknown);

  // Convert payload to base64
  const payload = btoa(JSON.stringify(validatedMessage));

  const { exchange = "amq.default", properties = {} } = options;

  const body = {
    properties,
    routing_key: queue,
    payload,
    payload_encoding: "base64" as const,
  };

  // Decide endpoint & fetch method based on environment
  const isProd = env.NODE_ENV === "production";
  const baseURL = isProd ? "http://rabbitmq:15672" : `http://127.0.0.1:15672`;
  const publishURL = `${baseURL}/api/exchanges/%2F/${encodeURIComponent(exchange)}/publish`;

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  let response: Response;
  try {
    response = isProd
      ? await env.VPC_SERVICE.fetch(publishURL, requestInit)
      : await fetch(publishURL, requestInit);
  }
  catch (error) {
    console.error(`[RabbitMQ] Error connecting to: ${publishURL}`, error);
    throw new Error(`RabbitMQ connection failed: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to publish message to queue "${queue}": ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  const result = PublishResponseSchema.parse(data);

  if (!result.routed) {
    throw new Error(
      `Message was not routed to queue "${queue}". Check that the queue exists and bindings are correct.`,
    );
  }

  return result.routed;
}
