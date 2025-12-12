import type { CreateKeywordRoute, GetKeywordsRoute, DeleteKeywordRoute } from "./keywords.routes";
import type { AppRouteHandler } from "@/utils/types";
import { eq, and } from "drizzle-orm";
import { getDB } from "@/db";
import { projects, keywords } from "@/db/schema";

export const getKeywords: AppRouteHandler<GetKeywordsRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ message: "Project not found" }, 404);

  // Obtener todas las keywords del proyecto
  const projectKeywords = await db.query.keywords.findMany({
    where: eq(keywords.projectId, projectId),
  });

  return c.json(projectKeywords, 200);
};

export const createKeyword: AppRouteHandler<CreateKeywordRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  const body = c.req.valid("json");
  const userId = payload.sub;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ message: "Project not found" }, 404);

  // Solo owner puede agregar keywords
  if (project.ownerId !== userId) return c.json({ message: "Forbidden" }, 403);

  // Verificar si la keyword ya existe en el proyecto
  const existing = await db.query.keywords.findFirst({
    where: and(
      eq(keywords.projectId, projectId),
      eq(keywords.content, body.content)
    ),
  });
  if (existing) return c.json({ message: "Keyword already exists" }, 400);

  // Insertar la keyword con projectId
  const [newKeyword] = await db.insert(keywords).values({
    content: body.content,
    projectId,
  }).returning();

  return c.json(newKeyword, 201);
};

export const deleteKeyword: AppRouteHandler<DeleteKeywordRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload) return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const { id: projectId, keywordId } = c.req.valid("param");
  const userId = payload.sub;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return c.json({ message: "Project not found" }, 404);

  // Solo owner puede eliminar keywords
  if (project.ownerId !== userId) return c.json({ message: "Forbidden" }, 403);

  // Buscar keyword
  const keyword = await db.query.keywords.findFirst({
    where: and(
      eq(keywords.id, keywordId),
      eq(keywords.projectId, projectId)
    ),
  });
  if (!keyword) return c.json({ message: "Keyword not found" }, 404);

  // Eliminar keyword
  await db.delete(keywords).where(eq(keywords.id, keywordId));

  return c.json({ message: "Keyword deleted" }, 200);
};
