// ============================================
// Database Schema - Drizzle ORM
// ============================================

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 生成UUID的辅助函数
export const genUUID = () => sql`gen_random_uuid()`;

// Users 表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(genUUID()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  claudeApiKeyEncrypted: text('claude_api_key_encrypted'),
  preferences: jsonb('preferences').$type<{
    filter_keywords: string[];
    filter_sources: string[];
    filter_categories: string[];
    notification_enabled: boolean;
    daily_digest: boolean;
    digest_time: string;
  }>().default({
    filter_keywords: [],
    filter_sources: [],
    filter_categories: ['entertainment'],
    notification_enabled: true,
    daily_digest: true,
    digest_time: '08:00',
  }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

// Categories 表
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().default(genUUID()),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  isActive: boolean('is_active').default(true),
});

// News 表
export const news = pgTable('news', {
  id: uuid('id').primaryKey().default(genUUID()),
  newsApiId: varchar('news_api_id', { length: 255 }).unique(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  urlToImage: text('url_to_image'),
  content: text('content'),
  description: text('description'),
  summaryAi: text('summary_ai'),
  sourceName: varchar('source_name', { length: 255 }),
  sourceId: varchar('source_id', { length: 255 }),
  author: text('author'),
  publishedAt: timestamp('published_at').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  country: varchar('country', { length: 2 }),
  language: varchar('language', { length: 2 }),
  importanceScore: decimal('importance_score', { precision: 3, scale: 2 }).default('0.5'),
  keywords: jsonb('keywords').$type<string[]>().default(sql`'[]'::jsonb`),
  isBreaking: boolean('is_breaking').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  publishedAtIdx: index('idx_news_published_at').on(table.publishedAt),
  importanceIdx: index('idx_news_importance').on(table.importanceScore),
  categoryIdx: index('idx_news_category').on(table.categoryId),
  countryIdx: index('idx_news_country').on(table.country),
  keywordsIdx: index('idx_news_keywords').using('gin', table.keywords),
  fulltextIdx: index('idx_news_fulltext').using('gin',
    sql`to_tsvector('english', ${table.title} || ' ' || COALESCE(${table.content}, ''))`
  ),
}));

// Bookmarks 表
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().default(genUUID()),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: uuid('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_bookmarks_user').on(table.userId),
  newsIdIdx: index('idx_bookmarks_news').on(table.newsId),
  createdAtIdx: index('idx_bookmarks_created').on(table.createdAt),
  userNewsUnique: index('bookmarks_user_news_unique').on(table.userId, table.newsId),
}));

// Conversations 表
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().default(genUUID()),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: uuid('news_id').references(() => news.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  messages: jsonb('messages').$type<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    sources?: string[];
  }>>().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_conversations_user').on(table.userId),
  newsIdIdx: index('idx_conversations_news').on(table.newsId),
  updatedAtIdx: index('idx_conversations_updated').on(table.updatedAt),
}));

// Reading History 表
export const readingHistory = pgTable('reading_history', {
  id: uuid('id').primaryKey().default(genUUID()),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  newsId: uuid('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at').defaultNow(),
  readDuration: integer('read_duration').default(0),
}, (table) => ({
  userIdx: index('idx_history_user').on(table.userId),
  viewedAtIdx: index('idx_history_viewed').on(table.viewedAt),
  userNewsUnique: index('history_user_news_unique').on(table.userId, table.newsId),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ReadingHistory = typeof readingHistory.$inferSelect;
export type NewReadingHistory = typeof readingHistory.$inferInsert;
