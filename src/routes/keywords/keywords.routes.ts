import { createRoute, z } from "@hono/zod-openapi";
import { insertKeywordSchema, selectKeywordSchema } from "@/db/schema";

// Crear keyword en un proyecto
export const createKeyword = createRoute({
  method: "post",
  path: "/projects/{id}/keywords",
  description: "Add a keyword to a project",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number), // projectId
    }),
    body: {
      content: {
        "application/json": {
          schema: insertKeywordSchema.omit({ id: true, projectId: true }),
        },
      },
    },
  },
  responses: {
    201: { description: "Keyword created", content: { "application/json": { schema: selectKeywordSchema } } },
    400: { description: "Keyword already exists or invalid" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

export type CreateKeywordRoute = typeof createKeyword;
