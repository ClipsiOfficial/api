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
          schema: insertProjectSchema
            .omit({ id: true , members: true , ownerId: true })
            .extend({
              keywords: z.array(z.string()).optional(),
            }),
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

export const deleteProject = createRoute({
  method: "delete",
  path: "/projects/{id}",
  description: "Delete a project",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Project deleted",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

// Get all projects of the logged user
export const getProjects = createRoute({
  method: "get",
  path: "/projects",
  description: "Get all projects for the logged user",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
  },
  responses: {
    200: {
      description: "List of projects",
      content: {
        "application/json": {
          schema: z.array(selectProjectSchema),
        },
      },
    },
    401: { description: "Unauthorized" },
  },
});

export const getProject = createRoute({
  method: "get",
  path: "/projects/{id}",
  description: "Get a project by ID",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Project found",
      content: {
        "application/json": {
          schema: selectProjectSchema,
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

export const updateProjectInfo = createRoute({
  method: "patch",
  path: "/projects/{id}",
  description: "Update project name and description",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Project updated" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

export const addProjectMember = createRoute({
  method: "post",
  path: "/projects/{id}/members",
  description: "Add a member to a project (owner only)",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            userId: z.number(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Member added" },
    400: { description: "User already a member or does not exist" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

export const removeProjectMember = createRoute({
  method: "delete",
  path: "/projects/{id}/members",
  description: "Remove a member from a project (owner only, cannot remove self)",
  request: {
    headers: z.object({
      Authorization: z.string().openapi({
        param: { name: "Authorization", in: "header" },
      }),
    }),
    params: z.object({
      id: z.string().transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            userId: z.number(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Member removed" },
    400: { description: "Cannot remove owner or user not a member" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Project not found" },
  },
});

export type RemoveProjectMemberRoute = typeof removeProjectMember;
export type AddProjectMemberRoute = typeof addProjectMember;
export type UpdateProjectInfoRoute = typeof updateProjectInfo;
export type GetProjectRoute = typeof getProject;
export type GetProjectsRoute = typeof getProjects;
export type DeleteProjectRoute = typeof deleteProject;
export type CreateProjectRoute = typeof createProject;
