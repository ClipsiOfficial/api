import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "..";

const router = createRouter();

const route = createRoute({
  method: "get",
  path: "/hello",
  description: "Root endpoint",
  responses: {
    200: {
      description: "Successful response",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
  },
});

router.openapi(route, async (c) => {
  return c.json({ message: "Hello Hono!" });
});

export default router;
