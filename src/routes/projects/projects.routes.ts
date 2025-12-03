import { createRoute, z } from "@hono/zod-openapi";
import { insertProjectSchema, selectProjectSchema } from "@/db/schema";


// Create a project
export const createProject = createRoute({
  method: "post",
  path: "/projects",
  description: "Create a new project",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: insertProjectSchema.omit({ id: true }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "Project created",
      content: {
        "application/json": {
          schema: selectProjectSchema,
        },
      },
    },
    401: { description: "Unauthorized" },
  },
});


export type CreateProjectRoute = typeof createProject;
