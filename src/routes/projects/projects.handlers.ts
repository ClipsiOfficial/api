import type { CreateProjectRoute, DeleteProjectRoute, GetProjectsRoute, GetProjectRoute, UpdateProjectInfoRoute, AddProjectMemberRoute, RemoveProjectMemberRoute } from "./projects.routes";
import type { AppRouteHandler } from "@/utils/types";
import { compare, hash } from "bcryptjs";

import { eq , SQL, sql } from "drizzle-orm";
import { sign } from "hono/jwt";

import { getDB } from "@/db";
import { projects, users, usersToProjects } from "@/db/schema";


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

  const projectLimit = userRequest.subscriptionId === 1 ? 1 : 6;

  const { count: ownedCount } = (await db
  .select({ count: sql<number>`count(*)` })
  .from(projects)
  .where(eq(projects.ownerId, userRequest.id))
  )[0];

  const { count: memberCount } = (await db
  .select({ count: sql<number>`count(*)` })
  .from(usersToProjects)
  .where(eq(usersToProjects.userId, userRequest.id))
  )[0];

  const currentProjects = ownedCount + memberCount;

  if (currentProjects >= projectLimit) {
    return c.json({ message: "Project limit reached for your plan" }, 403);
  }

  // Insert new project into the database and assign the ownerId 
  const [newProject] = await db.insert(projects).values({
  ...body,
  ownerId: userRequest.id,
  } ).returning();

  // Return to frontend the new project and the 201 status code(created)
  return c.json(newProject, 201);
};

export const deleteProject: AppRouteHandler<DeleteProjectRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;

  // Buscar el proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project) return c.json({ message: "Project not found" }, 404);

  // Verificar si es el owner
  if (project.ownerId !== payload.sub) {
    return c.json({ message: "You are not the owner of this project" }, 403);
  }

  // Eliminar el proyecto
  await db.delete(projects).where(eq(projects.id, id));

  return c.json({ message: "Project deleted successfully" }, 200);
};


// Get all projects for the logged user
export const getUserProjects: AppRouteHandler<GetProjectsRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);

  // Proyectos que el usuario posee
  const owned = await db.query.projects.findMany({
    where: eq(projects.ownerId, payload.sub),
  });


  const memberRows = await db
    .select({
      project: projects,  // get the projects columns
    })
    .from(usersToProjects)
    .innerJoin(projects, eq(projects.id, usersToProjects.projectId))
    .where(eq(usersToProjects.userId, payload.sub));

  const member = memberRows.map((r) => r.project);

  // Join with no duplicates
  const allProjects = [...owned, ...member];

  return c.json(allProjects, 200);
};

export const getProject: AppRouteHandler<GetProjectRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;

  // Search for the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project) return c.json({ message: "Project not found" }, 404);

  const userId = payload.sub;

  // Check if owner
  if (project.ownerId === userId) {
    return c.json(project, 200);
  }

  // Check if member
  const member = await db.query.usersToProjects.findFirst({
    where: eq(usersToProjects.userId, userId),
  });

  if (!member) {
    return c.json({ message: "Forbidden" }, 403);
  }

  return c.json(project, 200);
};

export const updateProjectInfo: AppRouteHandler<UpdateProjectInfoRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;
  const body = c.req.valid("json");

  // Search for the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project) return c.json({ message: "Project not found" }, 404);

  const userId = payload.sub;
  let validUser = project.ownerId === userId;

  if (!validUser) {
    const member = await db.query.usersToProjects.findFirst({
      where: eq(usersToProjects.userId, userId),
    });
    validUser = !!member;
  }

  if (!validUser) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // Actualizar solo name y description
   const [updated] = await db
    .update(projects)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    })
    .where(eq(projects.id, id))
    .returning();

  return c.json(updated, 200);
};

export const addMember: AppRouteHandler<AddProjectMemberRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const userId = payload.sub;
  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  // User ID has de id of the new member to add
  const { userId: newMemberId } = c.req.valid("json");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ message: "Project not found" }, 404);

  // Just the owner can add members
  if (project.ownerId !== userId) return c.json({ message: "Forbidden" }, 403);

  // Verify the new member exists
  const newMember = await db.query.users.findFirst({
    where: eq(users.id, newMemberId),
  });
  if (!newMember) return c.json({ message: "User does not exist" }, 400);

  // Verifiy if the user is already a member
  const existing = await db.query.usersToProjects.findFirst({
    where: eq(usersToProjects.userId, newMemberId),
  });
  if (existing) return c.json({ message: "User already a member" }, 400);
  if (project.ownerId === userId) return c.json({ message: "User already a member" }, 400);
  
  // Add the new member
  await db.insert(usersToProjects).values({
    userId: newMemberId,
    projectId,
  });
  
  const [updatedProject] = await db
      .update(projects)
      .set({
        members: (project.members ?? 0) + 1,
      })
      .where(eq(projects.id, projectId))
      .returning();

  return c.json(updatedProject, 200);
};

export const removeMember: AppRouteHandler<RemoveProjectMemberRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const ownerId = payload.sub;
  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  const { userId: memberId } = c.req.valid("json");

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ message: "Project not found" }, 404);

  // Solo owner puede eliminar miembros
  if (project.ownerId !== ownerId) return c.json({ message: "Forbidden" }, 403);

  // El owner no puede eliminarse a sí mismo
  if (memberId === ownerId) return c.json({ message: "Cannot remove owner" }, 400);

  // Verificar que el usuario sea miembro
  const member = await db.query.usersToProjects.findFirst({
    where: eq(usersToProjects.userId, memberId),
  });
  if (!member) return c.json({ message: "User not a member" }, 400);

  // Eliminar miembro
  await db.delete(usersToProjects)
    .where(and(
    eq(usersToProjects.userId, memberId),
    eq(usersToProjects.projectId, projectId)
  ));

  // Decrementar contador de members
  const [updatedProject] = await db
    .update(projects)
    .set({
      members: Math.max((project.members ?? 1) - 1, 0),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return c.json(updatedProject, 200);
};


function and(arg0: SQL<unknown>, arg1: SQL<unknown>): import("drizzle-orm").SQL<unknown> | undefined {
  throw new Error("Function not implemented.");
}

