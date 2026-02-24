// SQLite Schema
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  claudeApiKeyEncrypted: text('claude_api_key_encrypted'),
  preferences: text('preferences', { mode: 'json' }).default(sql`'{}'`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  color: text('color'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const news = sqliteTable('news', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsApiId: text('news_api_id').unique(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  urlToImage: text('url_to_image'),
  content: text('content'),
  description: text('description'),
  summaryAi: text('summary_ai'),
  sourceName: text('source_name'),
  sourceId: text('source_id'),
  author: text('author'),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  country: text('country'),
  language: text('language'),
  importanceScore: integer('importance_score').default(50),
  keywords: text('keywords', { mode: 'json' }).default(sql`'[]'`),
  isBreaking: integer('is_breaking', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: integer('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: integer('news_id').references(() => news.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  messages: text('messages', { mode: 'json' }).default(sql`'[]'`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const readingHistory = sqliteTable('reading_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: integer('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  viewedAt: integer('viewed_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  readDuration: integer('read_duration').default(0),
});

export type User = typeof users.$inferSelect;
export type News = typeof news.$inferSelect;
export type Category = typeof categories.$inferSelect;
