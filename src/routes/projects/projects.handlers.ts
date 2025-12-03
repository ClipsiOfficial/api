import type { CreateProjectRoute } from "./projects.routes";
import type { AppRouteHandler } from "@/utils/types";
import { compare, hash } from "bcryptjs";

import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";

import { getDB } from "@/db";
import { projects, users } from "@/db/schema";


// Create project
export const createProject: AppRouteHandler<CreateProjectRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  // Get request data and get DB instance
  const body = c.req.valid("json");
  const db = getDB(c.env);

  // Get the user from BD that coincides with the JWT payload
  const userRequest = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });

  // If no user found, return 404
  if (!userRequest) return c.json({ message: "User not found" }, 404);

  const projectLimit = userRequest.subscriptionId === 1 ? 1 : 5;

  //const currentProjects = await db.query.projects.count({
  //  where: eq(projects.member, user.id),
  //});

  //if (currentProjects >= projectLimit) {
  //  return c.json({ message: "Project limit reached for your plan" }, 403);
  //}

  // Insert new project into the database and assign the ownerId 
  const [newProject] = await db.insert(projects).values({
  ...body,
  ownerId: userRequest.id,
  } ).returning();

  // Return to frontend the new project and the 201 status code(created)
  return c.json(newProject, 201);
};

