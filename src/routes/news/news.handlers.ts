import type { CreateNewsRoute, DeleteSavedNewsRoute, ExistsNewsRoute, GetNewsRoute, GetNewsSourcesRoute, GetSavedNewsRoute, SaveNewsRoute, UpdateSavedNewsRoute } from "./news.routes";
import type { AppRouteHandler } from "@/utils/types";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDB } from "@/db";
import { keywords, keywordsToNews, news, projects, savedNews, usersToProjects } from "@/db/schema";

export const createNews: AppRouteHandler<CreateNewsRoute> = async (c) => {
  const { keyword_id, rss_atom_id, url, title, summary, source, published_date } = c.req.valid("json");
  const db = getDB(c.env);
  const jwt = c.get("jwtPayload");

  if (!jwt || jwt.role !== "admin") {
    return c.json({ message: "Forbidden - Admin access required" }, 403);
  }

  try {
    const [newNews] = await db.insert(news).values({
      url,
      title,
      summary,
      source,
      timestamp: published_date ?? new Date(),
      rssAtomId: rss_atom_id,
    }).returning();

    await db.insert(keywordsToNews).values({
      newsId: newNews.id,
      keywordId: keyword_id,
    });

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
  const { projectId } = c.req.valid("json");
  const newsId = c.req.valid("param").id;
  const db = getDB(c.env);
  const jwt = c.get("jwtPayload");

  if (!jwt) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (jwt.role !== "admin") {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { id: true, ownerId: true },
    });

    if (!project) {
      return c.json({ message: "Project not found" }, 404);
    }

    const isOwner = project.ownerId === jwt.sub;
    const isMember = await db.query.usersToProjects.findFirst({
      where: and(
        eq(usersToProjects.projectId, projectId),
        eq(usersToProjects.userId, jwt.sub),
      ),
    });

    if (!isOwner && !isMember) {
      return c.json({ message: "Forbidden - You do not have access to this project" }, 403);
    }
  }

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
  const bodyData = c.req.valid("json");
  const db = getDB(c.env);
  const jwt = c.get("jwtPayload");

  if (!jwt) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const savedNewsItem = await db.query.savedNews.findFirst({
    where: eq(savedNews.id, id),
    columns: { id: true, projectId: true },
  });

  if (!savedNewsItem) {
    return c.json({ message: "Saved news not found" }, 404);
  }

  if (jwt.role !== "admin") {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, savedNewsItem.projectId),
      columns: { id: true, ownerId: true },
    });

    if (!project) {
      return c.json({ message: "Project not found" }, 404);
    }

    const isOwner = project.ownerId === jwt.sub;
    const isMember = await db.query.usersToProjects.findFirst({
      where: and(
        eq(usersToProjects.projectId, savedNewsItem.projectId),
        eq(usersToProjects.userId, jwt.sub),
      ),
    });

    if (!isOwner && !isMember) {
      return c.json({ message: "Forbidden - You do not have access to this project" }, 403);
    }
  }

  // Si summary es null, convertir a string vacío
  const body = {
    ...bodyData,
    summary: bodyData.summary === null ? "" : bodyData.summary,
  };

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
  const { projectId, page, limit, search, sources, dateFrom, dateTo } = c.req.valid("query");
  const db = getDB(c.env);

  // 1. Get keywords for the project (only visible ones)
  const projectKeywords = await db.query.keywords.findMany({
    where: and(
      eq(keywords.projectId, projectId),
      eq(keywords.visible, 1),
    ),
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

  // Filter by sources
  if (sources) {
    const sourceList = sources.split(",").map(s => s.trim());
    conditions.push(inArray(news.source, sourceList));
  }

  // Filter by date range
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    conditions.push(sql`${news.timestamp} >= ${fromDate.getTime() / 1000}`);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    // Set to end of day
    toDate.setHours(23, 59, 59, 999);
    conditions.push(sql`${news.timestamp} <= ${toDate.getTime() / 1000}`);
  }

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${news.id})` })
    .from(news)
    .innerJoin(keywordsToNews, and(eq(news.id, keywordsToNews.newsId)))
    .innerJoin(keywords, eq(keywordsToNews.keywordId, keywords.id))
    .where(and(...conditions));

  // Fetch data
  const data = await db
    .selectDistinct({
      id: news.id,
      url: news.url,
      title: news.title,
      summary: news.summary,
      timestamp: news.timestamp,
      source: news.source,
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

export const getNewsSources: AppRouteHandler<GetNewsSourcesRoute> = async (c) => {
  const { projectId } = c.req.valid("query");
  const db = getDB(c.env);

  // 1. Get keywords for the project
  const projectKeywords = await db.query.keywords.findMany({
    where: eq(keywords.projectId, projectId),
  });

  if (projectKeywords.length === 0) {
    return c.json({ sources: [] });
  }

  const keywordIds = projectKeywords.map(k => k.id);

  // 2. Get sources ordered by count of news
  const sourcesWithCount = await db
    .select({
      source: news.source,
      count: sql<number>`count(${news.id})`,
    })
    .from(news)
    .innerJoin(keywordsToNews, eq(news.id, keywordsToNews.newsId))
    .where(inArray(keywordsToNews.keywordId, keywordIds))
    .groupBy(news.source)
    .orderBy(desc(sql`count(${news.id})`));

  // 3. Map to array of strings
  const sources = sourcesWithCount.map(item => item.source);

  return c.json({ sources });
};

export const existsNews: AppRouteHandler<ExistsNewsRoute> = async (c) => {
  const { url } = c.req.valid("query");
  const jwt = c.get("jwtPayload");
  const db = getDB(c.env);

  if (!jwt || jwt.role !== "admin") {
    return c.json({ message: "Forbidden - Admin access required" }, 403);
  }

  const existingNews = await db.query.news.findFirst({
    where: eq(news.url, url),
    columns: { id: true },
  });

  return c.json({ exists: !!existingNews });
};

export const getSavedNews: AppRouteHandler<GetSavedNewsRoute> = async (c) => {
  const { projectId, page, limit, search, categories, sources, dateFrom, dateTo } = c.req.valid("query");
  const db = getDB(c.env);

  const conditions = [
    eq(savedNews.projectId, projectId),
  ];

  if (search) {
    conditions.push(
      sql`(${savedNews.title} LIKE ${`%${search}%`} OR ${savedNews.summary} LIKE ${`%${search}%`})`,
    );
  }

  if (categories) {
    const categoryList = categories.split(",").map(s => s.trim()).filter(Boolean);
    if (categoryList.length > 0) {
      conditions.push(inArray(savedNews.category, categoryList));
    }
  }

  if (sources) {
    const sourceList = sources.split(",").map(s => s.trim());
    conditions.push(inArray(news.source, sourceList));
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    if (Number.isNaN(fromDate.getTime())) {
      return c.json({ message: "Invalid dateFrom" }, 400);
    }
    conditions.push(sql`${news.timestamp} >= ${fromDate.getTime() / 1000}`);
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    if (Number.isNaN(toDate.getTime())) {
      return c.json({ message: "Invalid dateTo" }, 400);
    }
    toDate.setHours(23, 59, 59, 999);
    conditions.push(sql`${news.timestamp} <= ${toDate.getTime() / 1000}`);
  }

  // Count total
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(savedNews)
    .innerJoin(news, eq(savedNews.sourceNewId, news.id))
    .where(and(...conditions));

  const data = await db
    .select({
      id: savedNews.id,
      title: savedNews.title,
      summary: savedNews.summary,
      category: savedNews.category,
      views: savedNews.views,
      projectId: savedNews.projectId,
      url: news.url,
      timestamp: news.timestamp,
      source: news.source,
    })
    .from(savedNews)
    .innerJoin(news, eq(savedNews.sourceNewId, news.id))
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

export const deleteSavedNews: AppRouteHandler<DeleteSavedNewsRoute> = async (c) => {
  const id = c.req.valid("param").id;
  const db = getDB(c.env);
  const jwt = c.get("jwtPayload");

  if (!jwt) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const savedNewsItem = await db.query.savedNews.findFirst({
    where: eq(savedNews.id, id),
    with: {
      project: true,
    },
  });

  if (!savedNewsItem) {
    return c.json({ message: "Saved news not found" }, 404);
  }

  if (jwt.role !== "admin") {
    const isOwner = savedNewsItem.project.ownerId === jwt.sub;
    const isMember = await db.query.usersToProjects.findFirst({
      where: and(
        eq(usersToProjects.projectId, savedNewsItem.projectId),
        eq(usersToProjects.userId, jwt.sub),
      ),
    });

    if (!isOwner && !isMember) {
      return c.json({ message: "Forbidden - You do not have access to this project" }, 403);
    }
  }
  await db.delete(savedNews).where(eq(savedNews.id, id));

  return c.body(null, 204);
};
