import type { CreateKeywordRoute } from "./keywords.routes";
import type { AppRouteHandler } from "@/utils/types";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { projects, keywords } from "@/db/schema";

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
    where: eq(keywords.content, body.content),
  });
  if (existing) return c.json({ message: "Keyword already exists" }, 400);

  // Insertar la keyword con projectId
  const [newKeyword] = await db.insert(keywords).values({
    content: body.content,
    projectId,
  }).returning();

  return c.json(newKeyword, 201);
};
