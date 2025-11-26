import type { CreateNewsRoute, SaveNewsRoute, UpdateSavedNewsRoute } from "./news.routes";
import type { AppRouteHandler } from "@/utils/types";
import { eq } from "drizzle-orm";
import { getDB } from "@/db";
import { news, newsToSavedNews, savedNews } from "@/db/schema";

export const createNews: AppRouteHandler<CreateNewsRoute> = async (c) => {
  const body = c.req.valid("json");
  const db = getDB(c.env);
  const jwt = c.get("jwtPayload");

  if (!jwt || jwt.role !== "admin") {
    return c.json({ message: "Forbidden - Admin access required" }, 401);
  }

  try {
    const [newNews] = await db.insert(news).values(body).returning();
    return c.json(newNews, 201);
  }
  catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return c.json({ message: "News already exists" }, 409);
    }
    throw error;
  }
};

export const saveNews: AppRouteHandler<SaveNewsRoute> = async (c) => {
  const { newsId, projectId } = c.req.valid("json");
  const db = getDB(c.env);

  // TODO: fetch project and check if it exists and the user has access to it (at least is member)

  // 1. Fetch the original news
  const originalNews = await db.query.news.findFirst({
    where: eq(news.id, newsId),
  });

  if (!originalNews) {
    return c.json({ message: "News not found" }, 404);
  }

  // 2. Create the saved news entry
  try {
    const [newSavedNews] = await db.insert(savedNews).values({
      title: originalNews.title,
      summary: originalNews.summary,
      projectId,
      sourceNewId: originalNews.id,
    }).returning();

    // 3. Link in the join table (optional but good for consistency if the table exists)
    await db.insert(newsToSavedNews).values({
      newsId: originalNews.id,
      savedNewsId: newSavedNews.id,
    });

    return c.json(newSavedNews, 201);
  }
  catch (error) {
    // Handle potential errors, e.g., project not found (foreign key constraint)
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return c.json({ message: "Project not found" }, 404);
    }
    throw error;
  }
};

export const updateSavedNews: AppRouteHandler<UpdateSavedNewsRoute> = async (c) => {
  const id = c.req.valid("param").id;
  const body = c.req.valid("json");
  const db = getDB(c.env);

  const [updatedSavedNews] = await db.update(savedNews)
    .set(body)
    .where(eq(savedNews.id, id))
    .returning();

  if (!updatedSavedNews) {
    return c.json({ message: "Saved news not found" }, 404);
  }

  return c.json(updatedSavedNews, 200);
};
