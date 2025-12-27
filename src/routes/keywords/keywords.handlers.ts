import type { CreateKeywordRoute, DeleteKeywordRoute, GetKeywordsRoute } from "./keywords.routes";
import type { AppRouteHandler } from "@/utils/types";
import { and, eq } from "drizzle-orm";
import { getDB } from "@/db";
import { keywords, projects } from "@/db/schema";

export const getKeywords: AppRouteHandler<GetKeywordsRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  const projectKeywords = await db.query.keywords.findMany({
    where: and(
      eq(keywords.projectId, projectId),
      eq(keywords.visible, 1),
    ),
  });

  return c.json(projectKeywords, 200);
};

export const createKeyword: AppRouteHandler<CreateKeywordRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const projectId = c.req.valid("param").id;
  const body = c.req.valid("json");
  const userId = payload.sub;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  if (project.ownerId !== userId)
    return c.json({ message: "Forbidden" }, 403);

  const normalizedContent = body.content.toLowerCase();

  const existing = await db.query.keywords.findFirst({
    where: and(
      eq(keywords.projectId, projectId),
      eq(keywords.content, normalizedContent),
    ),
  });

  if (existing) {
    if (existing.visible === 0) {
      const [reactivated] = await db.update(keywords)
        .set({ visible: 1 })
        .where(eq(keywords.id, existing.id))
        .returning();
      return c.json(reactivated, 200);
    }
    return c.json({ message: "Keyword already exists" }, 400);
  }

  const [newKeyword] = await db.insert(keywords).values({
    content: normalizedContent,
    projectId,
  }).returning();

  return c.json(newKeyword, 201);
};

export const deleteKeyword: AppRouteHandler<DeleteKeywordRoute> = async (c) => {
  const payload = c.get("jwtPayload");
  if (!payload)
    return c.json({ message: "Unauthorized" }, 401);

  const db = getDB(c.env);
  const { id: projectId, keywordId } = c.req.valid("param");
  const userId = payload.sub;

  // Buscar proyecto
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project)
    return c.json({ message: "Project not found" }, 404);

  // Solo owner puede eliminar keywords
  if (project.ownerId !== userId)
    return c.json({ message: "Forbidden" }, 403);

  // Buscar keyword
  const keyword = await db.query.keywords.findFirst({
    where: and(
      eq(keywords.id, keywordId),
      eq(keywords.projectId, projectId),
    ),
  });
  if (!keyword)
    return c.json({ message: "Keyword not found" }, 404);

  await db.update(keywords)
    .set({ visible: 0 })
    .where(eq(keywords.id, keywordId));

  return c.json({ message: "Keyword deleted" }, 200);
};
