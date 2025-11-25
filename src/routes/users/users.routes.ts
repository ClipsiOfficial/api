import { createRoute, z } from "@hono/zod-openapi";
import { insertUserSchema, selectUserSchema } from "@/db/schema";

// Login Route
export const login = createRoute({
  method: "post",
  path: "/auth/login",
  description: "User login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.email(),
            password: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successful login",
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            user: selectUserSchema.omit({ password: true }),
          }),
        },
      },
    },
    401: {
      description: "Invalid credentials",
    },
  },
});

// Create User Route (Admin only)
export const createUser = createRoute({
  method: "post",
  path: "/users",
  description: "Create a new user (Admin only)",
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
          schema: insertUserSchema.omit({ id: true }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: selectUserSchema.omit({ password: true }),
        },
      },
    },
    401: {
      description: "Unauthorized",
    },
    403: {
      description: "Forbidden - Admin access required",
    },
  },
});

// Update User Route
export const updateUser = createRoute({
  method: "patch",
  path: "/users/me",
  description: "Update current user information",
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
            username: z.string().min(3).optional(),
            email: z.email().optional(),
            password: z.string().min(6).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "User updated successfully",
      content: {
        "application/json": {
          schema: selectUserSchema.omit({ password: true }),
        },
      },
    },
    404: {
      description: "User not found",
    },
  },
});

export type LoginRoute = typeof login;
export type CreateUserRoute = typeof createUser;
export type UpdateUserRoute = typeof updateUser;
