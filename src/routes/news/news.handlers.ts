import type { CreateNewsRoute, GetNewsRoute, GetSavedNewsRoute, SaveNewsRoute, UpdateSavedNewsRoute } from "./news.routes";
import type { AppRouteHandler } from "@/utils/types";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDB } from "@/db";
import { keywords, keywordsToNews, news, newsToSavedNews, savedNews } from "@/db/schema";

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

export const getNews: AppRouteHandler<GetNewsRoute> = async (c) => {
  const { projectId, page, limit, search } = c.req.valid("query");
  const db = getDB(c.env);

  // 1. Get keywords for the project
  const projectKeywords = await db.query.keywords.findMany({
    where: eq(keywords.projectId, projectId),
  });

  if (projectKeywords.length === 0) {
    return c.json({ data: [], total: 0, page, limit });
  }

  const keywordIds = projectKeywords.map(k => k.id);

  // 2. Get saved news source IDs to exclude
  const savedNewsItems = await db.query.savedNews.findMany({
    where: eq(savedNews.projectId, projectId),
    columns: { sourceNewId: true },
  });
  const excludedNewsIds = savedNewsItems.map(sn => sn.sourceNewId);

  // 3. Build query for news
  const conditions = [
    inArray(keywordsToNews.keywordId, keywordIds),
  ];

  if (excludedNewsIds.length > 0) {
    conditions.push(notInArray(news.id, excludedNewsIds));
  }

  if (search) {
    conditions.push(
      sql`(${news.title} LIKE ${`%${search}%`} OR ${news.summary} LIKE ${`%${search}%`})`,
    );
  }

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${news.id})` })
    .from(news)
    .innerJoin(keywordsToNews, eq(news.id, keywordsToNews.newsId))
    .where(and(...conditions));

  // Fetch data
  const data = await db
    .selectDistinct({
      id: news.id,
      url: news.url,
      title: news.title,
      summary: news.summary,
      timestamp: news.timestamp,
      keywords: news.keywords,
      rssAtomId: news.rssAtomId,
    })
    .from(news)
    .innerJoin(keywordsToNews, eq(news.id, keywordsToNews.newsId))
    .where(and(...conditions))
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(desc(news.timestamp));

  return c.json({
    data,
    total: count,
    page,
    limit,
  });
};

export const getSavedNews: AppRouteHandler<GetSavedNewsRoute> = async (c) => {
  const { projectId, page, limit, search, category } = c.req.valid("query");
  const db = getDB(c.env);

  const conditions = [
    eq(savedNews.projectId, projectId),
  ];

  if (search) {
    conditions.push(
      sql`(${savedNews.title} LIKE ${`%${search}%`} OR ${savedNews.summary} LIKE ${`%${search}%`})`,
    );
  }

  if (category) {
    conditions.push(eq(savedNews.category, category));
  }

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(savedNews)
    .where(and(...conditions));

  // Fetch data
  const data = await db
    .select()
    .from(savedNews)
    .where(and(...conditions))
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(desc(savedNews.id));

  return c.json({
    data,
    total: count,
    page,
    limit,
  });
};
