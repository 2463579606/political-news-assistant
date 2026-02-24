// ============================================
// Database Connection - 支持 SQLite (测试) 和 PostgreSQL (生产)
// ============================================

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema-sqlite';

console.log('🗄️  Using SQLite for development/testing');

const sqlite = new Database('./political_news.db');
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;

// 导出 schema
export * from './schema-sqlite';
