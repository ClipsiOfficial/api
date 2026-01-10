import { createRoute, z } from "@hono/zod-openapi";
import { insertUserSchema, selectUserSchema } from "@/db/schema";

// Login Route
export const login = createRoute({
  method: "post",
  path: "/auth/login",
  description: "User login",
  summary: "Authenticate user and return access token",
  tags: ["Auth"],
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
  path: "/admin/user",
  description: "Create a new user (Admin only)",
  summary: "Create a new user account with specified role (Admin role only)",
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
  path: "/user",
  description: "Update current user information",
  summary: "Update fields of the current user's profile",
  tags: ["User"],
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
            username: z.string().min(3).max(20).optional(),
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
