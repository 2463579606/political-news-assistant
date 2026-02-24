// ============================================
// Application Configuration
// ============================================

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// 环境变量验证 Schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // API Keys
  CLAUDE_API_KEY: z.string().optional(),
  NEWS_API_KEY: z.string().optional(),

  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Encryption
  ENCRYPTION_KEY: z.string().length(32),

  // JWT (optional)
  JWT_SECRET: z.string().optional(),
});

// 解析和验证环境变量
export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  NEWS_API_KEY: process.env.NEWS_API_KEY,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
});

// 新闻源配置（可扩展）
export const NEWS_SOURCES = {
  newsapi: {
    name: 'NewsAPI',
    enabled: true,
    priority: 1,
    baseUrl: 'https://newsapi.org/v2',
    apiKey: env.NEWS_API_KEY,
  },
  // 未来可添加更多源
  // gnews: { name: 'GNews', enabled: false, priority: 2 },
  // currents: { name: 'Currents API', enabled: false, priority: 3 },
} as const;

// AI 模型配置
export const AI_CONFIG = {
  anthropic: {
    provider: 'anthropic' as const,
    model: 'claude-3-5-sonnet-20241022',
    defaultMaxTokens: 2000,
  },
  // 未来可添加更多模型
  // openai: { provider: 'openai' as const, model: 'gpt-4-turbo' },
} as const;

// 分类配置映射
export const CATEGORY_MAP: Record<string, string> = {
  general: '其他',
  politics: '时政',
  business: '财经',
  technology: '科技',
  world: '国际',
  entertainment: '娱乐', // 会被过滤
  health: '健康',
  science: '科学',
  sports: '体育',
};

// 默认过滤的分类
export const DEFAULT_FILTERED_CATEGORIES = ['entertainment', 'sports', 'gaming'];
