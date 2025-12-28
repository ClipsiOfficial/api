import type { AddProjectMemberRoute, CreateProjectRoute, DeleteProjectRoute, GetProjectMembersRoute, GetProjectRoute, GetProjectsRoute, RemoveProjectMemberRoute, UpdateProjectInfoRoute } from "./projects.routes";
import type { AppRouteHandler } from "@/utils/types";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDB } from "@/db";
import { keywords, keywordsToNews, projects, savedNews, subscriptions, users, usersToProjects } from "@/db/schema";

// Create project
export const createProject: AppRouteHandler<CreateProjectRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  // Get request data and get DB instance
  const body = c.req.valid("json");
  const db = getDB(c.env);

  // Get the user from BD that coincides with the JWT payload
  const userRequest = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });

  // If no user found, return 404
  if (!userRequest)
    return c.json({ message: "User not found" }, 404);

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, userRequest.subscriptionId),
  });

  if (!subscription) {
    return c.json({ message: "Subscription not found" }, 404);
  }

  const { count: ownedCount } = (await db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(eq(projects.ownerId, userRequest.id))
  )[0];

  if (ownedCount >= subscription.projectLimit) {
    return c.json({ message: "Project limit reached for your plan" }, 403);
  }

  // Insert new project into the database and assign the ownerId from JWT
  const [newProject] = await db.insert(projects).values({
    ...body,
    ownerId: userRequest.id,
  }).returning();

  // Return to frontend the new project and the 201 status code(created)
  return c.json(newProject, 201);
};

export const deleteProject: AppRouteHandler<DeleteProjectRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;

  // Buscar el proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project)
    return c.json({ message: "Project not found" }, 404);

  // Verificar si es el owner
  if (project.ownerId !== payload.sub) {
    return c.json({ message: "You are not the owner of this project" }, 403);
  }

  // 1. Eliminar las relaciones de usersToProjects primero
  await db.delete(usersToProjects).where(eq(usersToProjects.projectId, id));

  // 2. Eliminar savedNews asociadas al proyecto
  await db.delete(savedNews).where(eq(savedNews.projectId, id));

  // 3. Obtener keywords del proyecto
  const projectKeywords = await db.query.keywords.findMany({
    where: eq(keywords.projectId, id),
  });

  const keywordIds = projectKeywords.map(k => k.id);

  // 4. Eliminar las relaciones keywordsToNews
  if (keywordIds.length > 0) {
    await db
      .delete(keywordsToNews)
      .where(inArray(keywordsToNews.keywordId, keywordIds));
  }

  // 5. Eliminar las keywords del proyecto
  await db.delete(keywords).where(eq(keywords.projectId, id));

  // 6. Finalmente, eliminar el proyecto
  await db.delete(projects).where(eq(projects.id, id));

  return c.json({ message: "Project deleted successfully" }, 200);
};

// Get all projects for the logged user
export const getUserProjects: AppRouteHandler<GetProjectsRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);

  // Proyectos que el usuario posee
  const owned = await db.query.projects.findMany({
    where: eq(projects.ownerId, payload.sub),
  });

  const memberRows = await db
    .select({
      project: projects, // get the projects columns
    })
    .from(usersToProjects)
    .innerJoin(projects, eq(projects.id, usersToProjects.projectId))
    .where(eq(usersToProjects.userId, payload.sub));

  const member = memberRows.map(r => r.project);

  // Join with no duplicates
  const allProjects = [...owned, ...member];

  return c.json(allProjects, 200);
};

export const getProject: AppRouteHandler<GetProjectRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;

  // Search for the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project)
    return c.json({ message: "Project not found" }, 404);

  const userId = payload.sub;

  // Check if owner
  if (project.ownerId === userId) {
    return c.json(project, 200);
  }

  // Check if member
  const member = await db.query.usersToProjects.findFirst({
    where: and(eq(usersToProjects.userId, userId), eq(usersToProjects.projectId, id)),
  });

  if (!member) {
    return c.json({ message: "Forbidden" }, 403);
  }

  return c.json(project, 200);
};

export const updateProjectInfo: AppRouteHandler<UpdateProjectInfoRoute> = async (c) => {
  // Authenticate user
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const id = c.req.valid("param").id;
  const body = c.req.valid("json");

  // Search for the project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project)
    return c.json({ message: "Project not found" }, 404);

  const userId = payload.sub;
  let validUser = project.ownerId === userId;

  if (!validUser) {
    const member = await db.query.usersToProjects.findFirst({
      where: and(eq(usersToProjects.userId, userId), eq(usersToProjects.projectId, id)),
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

export const getProjectMembers: AppRouteHandler<GetProjectMembersRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;

  // Verify project exists
  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  const userId = payload.sub;
  // Only owner or project members can view member list
  const allowed = project.ownerId === userId;
  if (!allowed)
    return c.json({ message: "Forbidden" }, 403);

  const rows = await db
    .select({ user: users })
    .from(usersToProjects)
    .innerJoin(users, eq(users.id, usersToProjects.userId))
    .where(eq(usersToProjects.projectId, projectId));

  const members = rows.map(r => r.user);
  return c.json(members, 200);
};

export const addMember: AppRouteHandler<AddProjectMemberRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const userId = payload.sub;
  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  const body = c.req.valid("json");
  let newMemberId: number;

  // If email is provided, find the user by email
  if ("email" in body && body.email) {
    const newMember = await db.query.users.findFirst({
      where: eq(users.email, body.email as string),
    });
    if (!newMember)
      return c.json({ message: "User does not exist" }, 400);
    newMemberId = newMember.id;
  }
  else {
    return c.json({ message: "Email field is required" }, 400);
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  // Just the owner can add members
  if (project.ownerId !== userId)
    return c.json({ message: "Forbidden" }, 403);

  // Verify the new member exists
  const newMember = await db.query.users.findFirst({
    where: eq(users.id, newMemberId),
  });
  if (!newMember)
    return c.json({ message: "User does not exist" }, 400);

  // Verifiy if the user is already a member
  const existing = await db.query.usersToProjects.findFirst({
    where: eq(usersToProjects.userId, newMemberId),
  });
  if (existing || project.ownerId === newMemberId)
    return c.json({ message: "User already a member" }, 400);

  // Add the new member
  await db.insert(usersToProjects).values({
    userId: newMemberId,
    projectId,
  });

  return c.json("Member added successfully", 200);
};

export const removeMember: AppRouteHandler<RemoveProjectMemberRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const ownerId = payload.sub;
  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  const { userId: memberId } = c.req.valid("json");

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  // Solo owner puede eliminar miembros
  if (project.ownerId !== ownerId)
    return c.json({ message: "Forbidden" }, 403);

  // El owner no puede eliminarse a sí mismo
  if (memberId === ownerId)
    return c.json({ message: "Cannot remove owner" }, 400);

  // Verificar que el usuario sea miembro
  const member = await db.query.usersToProjects.findFirst({
    where: eq(usersToProjects.userId, memberId),
  });
  if (!member)
    return c.json({ message: "User not a member" }, 400);

  // Eliminar miembro
  await db.delete(usersToProjects)
    .where(and(
      eq(usersToProjects.userId, memberId),
      eq(usersToProjects.projectId, projectId),
    ));

  return c.json("Member removed succesfuly", 200);
};
