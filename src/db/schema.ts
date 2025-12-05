import { relations } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Enums
export const rssAtomSourceEnum = ["manual", "found", "inherited"] as const;
export type RssAtomSource = (typeof rssAtomSourceEnum)[number];

export const userRolesEnum = ["admin", "user"] as const;
export type UserRole = (typeof userRolesEnum)[number];

// Tables
export const subscriptions = sqliteTable("subscription", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 20 }).notNull(),
  price: real("price").notNull(),
});

export const users = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username", { length: 20 }).notNull().unique(),
  email: text("email", { length: 255 }).notNull().unique(),
  password: text("password", { length: 60 }).notNull(),
  role: text("role", { enum: userRolesEnum }).notNull().default("user"),
  subscriptionId: integer("subscription").notNull().references(() => subscriptions.id),
});

export const projects = sqliteTable("project", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 30 }).notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  members: integer("members"),
  ownerId: integer("owner").notNull().references(() => users.id),
});

export const rssAtoms = sqliteTable("rss_atom", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id),
  url: text("url").notNull(),
  source: text("source", { enum: rssAtomSourceEnum }),
}, t => ([
  uniqueIndex("rss_atom_project_id_url_idx").on(t.projectId, t.url),
]));

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary").default("no disponible"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  rssAtomId: integer("rss_atom").references(() => rssAtoms.id),
});

export const savedNews = sqliteTable("saved_news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  summary: text("summary").default("no disponible"),
  projectId: integer("project_id").notNull().references(() => projects.id),
  sourceNewId: integer("source_new").notNull(),
  category: text("category"),
  views: integer("views").notNull().default(0),
});

export const keywords = sqliteTable("keyword", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  searches: integer("searches").notNull().default(0),
  projectId: integer("project_id").notNull().references(() => projects.id),
  allProcessed: integer("all_processed").notNull().default(0), // TODO: Create and endpoint to mark that all news have been  found by this keyword (valid for admin)
  visible: integer("visible").notNull().default(1), // TODO: Create and endpoint to toggle visibility (valid for admin and project owners)
}, t => ([
  uniqueIndex("keyword_project_id_content_idx").on(t.projectId, t.content),
]));

// Join Tables

export const usersToProjects = sqliteTable("user_project", {
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
}, t => ([
  primaryKey({ columns: [t.userId, t.projectId] }),
]));

export const keywordsToNews = sqliteTable("keyword_news", {
  keywordId: integer("keyword_id").references(() => keywords.id),
  newsId: integer("news_id").references(() => news.id),
}, t => ([
  primaryKey({ columns: [t.keywordId, t.newsId] }),
]));

// Relations

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [users.subscriptionId],
    references: [subscriptions.id],
  }),
  ownedProjects: many(projects, { relationName: "owner" }),
  projects: many(usersToProjects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  users: many(usersToProjects),
  keywords: many(keywords),
  rssAtoms: many(rssAtoms),
  savedNews: many(savedNews),
}));

export const usersToProjectsRelations = relations(usersToProjects, ({ one }) => ({
  user: one(users, {
    fields: [usersToProjects.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [usersToProjects.projectId],
    references: [projects.id],
  }),
}));

export const rssAtomsRelations = relations(rssAtoms, ({ one, many }) => ({
  project: one(projects, {
    fields: [rssAtoms.projectId],
    references: [projects.id],
  }),
  news: many(news),
}));

export const newsRelations = relations(news, ({ one, many }) => ({
  rssAtom: one(rssAtoms, {
    fields: [news.rssAtomId],
    references: [rssAtoms.id],
  }),
  keywords: many(keywordsToNews),
}));

export const savedNewsRelations = relations(savedNews, ({ one }) => ({
  project: one(projects, {
    fields: [savedNews.projectId],
    references: [projects.id],
  }),
}));

export const keywordsRelations = relations(keywords, ({ one, many }) => ({
  project: one(projects, {
    fields: [keywords.projectId],
    references: [projects.id],
  }),
  news: many(keywordsToNews),
}));

export const keywordsToNewsRelations = relations(keywordsToNews, ({ one }) => ({
  keyword: one(keywords, {
    fields: [keywordsToNews.keywordId],
    references: [keywords.id],
  }),
  news: one(news, {
    fields: [keywordsToNews.newsId],
    references: [news.id],
  }),
}));

// Zod Schemas
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

export const insertRssAtomSchema = createInsertSchema(rssAtoms);
export const selectRssAtomSchema = createSelectSchema(rssAtoms);

export const insertNewsSchema = createInsertSchema(news);
export const selectNewsSchema = createSelectSchema(news);

export const insertSavedNewsSchema = createInsertSchema(savedNews);
export const selectSavedNewsSchema = createSelectSchema(savedNews);

export const insertKeywordSchema = createInsertSchema(keywords);
export const selectKeywordSchema = createSelectSchema(keywords);
