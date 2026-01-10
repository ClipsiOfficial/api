import type { Env } from "@/utils/env";
import { asc, eq } from "drizzle-orm";
import { getDB } from "@/db";
import { keywords } from "@/db/schema";
import { publishToQueue } from "./rabbitmq";

async function handleSchedulers(controller: ScheduledController, env: Env) {
  switch (controller.cron) {
    case "0 9 * * *": // Every day at 9 AM
      await refreshFeeds(env);
      break;
    case "0 * * * *": // Every hour
      await searchNews(env);
      break;
    default:
      console.warn(`No scheduler found for controller: ${controller}`);
  }
}

async function searchNews(env: Env) {
  const db = getDB(env);

  // Find all projects and their top 5 keywords by searches
  const projects = await db.query.projects.findMany();
  for (const project of projects) {
    const topKeywords = await db.query.keywords.findMany({
      where: kb => eq(kb.projectId, project.id),
      orderBy: kb => [asc(kb.searches)],
      limit: 5,
    });

    // For each keyword, perform news search
    for (const keyword of topKeywords) {
      publishToQueue(env, "searcher", {
        project_id: project.id,
        topic: project.topic,
        keyword_id: keyword.id,
        keyword: keyword.content,
        searches: keyword.searches,
      });

      // Update searchers count
      await db.update(keywords)
        .set({ searches: keyword.searches + 1 })
        .where(eq(keywords.id, keyword.id));
    }
  }
}

async function refreshFeeds(env: Env) {
  const db = getDB(env);

  const rssFeeds = await db.query.rssAtoms.findMany();

  for (const feed of rssFeeds) {
    const projectKeywords = await db.query.keywords.findMany({
      where: kb => eq(kb.projectId, feed.projectId),
    });

    publishToQueue(env, "rss_atom", {
      rss_atom_id: feed.id,
      feed_url: feed.url,
      keywords: projectKeywords.map(kb => kb.content),
    });
  }
}

export default handleSchedulers;
