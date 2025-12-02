import { createRoute, z } from "@hono/zod-openapi";
import { insertSavedNewsSchema, selectNewsSchema, selectSavedNewsSchema } from "@/db/schema";

// Create News Route
export const createNews = createRoute({
  method: "post",
  path: "/news",
  description: "Create a new news entry",
  summary: "Create a new news entry (Admin role only)",
  tags: ["Admin Only"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            keyword_id: z.number(),
            rss_atom_id: z.number().optional(),
            url: z.url(),
            title: z.string(),
            summary: z.string(),
            published_date: z.date().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "News created successfully",
      content: {
        "application/json": {
          schema: selectNewsSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    409: {
      description: "News already exists",
    },
  },
});

// Save News Route (Copy from news to saved_news)
export const saveNews = createRoute({
  method: "post",
  path: "/news/{id}/save",
  description: "Save a news entry to a project",
  summary: "Copies an existing news entry to the saved_news table for a specific project",
  tags: ["News"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    params: z.object({
      id: z.string().transform(v => Number(v)),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            projectId: z.number(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "News saved successfully",
      content: {
        "application/json": {
          schema: selectSavedNewsSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    404: {
      description: "News or Project not found",
    },
  },
});

// Edit Saved News Route
export const updateSavedNews = createRoute({
  method: "patch",
  path: "/saved-news/{id}",
  description: "Update a saved news entry",
  summary: "Update fields of a saved news entry",
  tags: ["News"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    params: z.object({
      id: z.string().transform(v => Number(v)),
    }),
    body: {
      content: {
        "application/json": {
          schema: insertSavedNewsSchema.pick({
            title: true,
            summary: true,
            category: true,
            views: true,
          }).partial(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Saved news updated successfully",
      content: {
        "application/json": {
          schema: selectSavedNewsSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    404: {
      description: "Saved news not found",
    },
  },
});

// Get News Route
export const getNews = createRoute({
  method: "get",
  path: "/news",
  description: "Get news for a project",
  summary: "Retrieve news entries associated with a specific project",
  tags: ["News"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    query: z.object({
      projectId: z.string().transform(v => Number(v)).openapi({ param: { name: "projectId", in: "query" } }),
      page: z.string().optional().default("1").transform(v => Number(v)).openapi({ param: { name: "page", in: "query" } }),
      limit: z.string().optional().default("10").transform(v => Number(v)).openapi({ param: { name: "limit", in: "query" } }),
      search: z.string().optional().openapi({ param: { name: "search", in: "query" } }),
    }),
  },
  responses: {
    200: {
      description: "List of news",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(selectNewsSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
  },
});

export const existsNews = createRoute({
  method: "get",
  path: "/admin/news/exists",
  description: "Check if a news entry exists by URL",
  summary: "Check existence of a news entry based on its URL (Admin role only)",
  tags: ["Admin Only"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    query: z.object({
      url: z.url().openapi({ param: { name: "url", in: "query" } }),
    }),
  },
  responses: {
    200: {
      description: "News existence check",
      content: {
        "application/json": {
          schema: z.object({
            exists: z.boolean(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
  },
});

// Get Saved News Route
export const getSavedNews = createRoute({
  method: "get",
  path: "/saved-news",
  description: "Get saved news for a project",
  summary: "Retrieve saved news entries associated with a specific project",
  tags: ["News"],
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
        description: "Bearer access token",
      }),
    }),
    query: z.object({
      projectId: z.string().transform(v => Number(v)).openapi({ param: { name: "projectId", in: "query" } }),
      page: z.string().optional().default("1").transform(v => Number(v)).openapi({ param: { name: "page", in: "query" } }),
      limit: z.string().optional().default("10").transform(v => Number(v)).openapi({ param: { name: "limit", in: "query" } }),
      search: z.string().optional().openapi({ param: { name: "search", in: "query" } }),
      category: z.string().optional().openapi({ param: { name: "category", in: "query" } }),
    }),
  },
  responses: {
    200: {
      description: "List of saved news",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(selectSavedNewsSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number(),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
  },
});

export type CreateNewsRoute = typeof createNews;
export type SaveNewsRoute = typeof saveNews;
export type UpdateSavedNewsRoute = typeof updateSavedNews;
export type GetNewsRoute = typeof getNews;
export type ExistsNewsRoute = typeof existsNews;
export type GetSavedNewsRoute = typeof getSavedNews;
