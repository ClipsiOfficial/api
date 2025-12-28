import { createRoute, z } from "@hono/zod-openapi";
import { insertKeywordSchema, selectKeywordSchema } from "@/db/schema";

// Obtener keywords de un proyecto
export const getKeywords = createRoute({
  method: "get",
  path: "/projects/{id}/keywords",
  description: "Get all keywords for a project",
  tags: ["Project keywords"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number), // projectId
    }),
  },
  responses: {
    200: {
      description: "Keywords retrieved",
      content: {
        "application/json": {
          schema: z.array(selectKeywordSchema),
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Project not found" },
  },
});

// Crear keyword en un proyecto
export const createKeyword = createRoute({
  method: "post",
  path: "/projects/{id}/keywords",
  description: "Add a keyword to a project",
  tags: ["Project keywords"],
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

// Eliminar keyword de un proyecto
export const deleteKeyword = createRoute({
  method: "delete",
  path: "/projects/{id}/keywords/{keywordId}",
  description: "Delete a keyword from a project",
  tags: ["Project keywords"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number), // projectId
      keywordId: z.string().transform(Number),
    }),
  },
  responses: {
    200: { description: "Keyword deleted" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Keyword or project not found" },
  },
});

// Marcar keyword como procesada (admin only)
export const processKeyword = createRoute({
  method: "post",
  path: "/admin/keyword/{keywordId}/processed",
  description: "Mark a keyword as fully processed (admin only)",
  tags: ["Admin Only"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      keywordId: z.string().transform(Number),
    }),
  },
  responses: {
    200: { description: "Keyword marked as processed" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden - admin role required" },
    404: { description: "Keyword not found" },
  },
});

export type GetKeywordsRoute = typeof getKeywords;
export type CreateKeywordRoute = typeof createKeyword;
export type DeleteKeywordRoute = typeof deleteKeyword;
export type ProcessKeywordRoute = typeof processKeyword;
