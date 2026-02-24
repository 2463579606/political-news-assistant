// ============================================
// Zod 验证 Schema
// ============================================

import { z } from 'zod';

// 用户偏好 Schema
export const UserPreferencesSchema = z.object({
  filter_keywords: z.array(z.string()).default([]),
  filter_sources: z.array(z.string()).default([]),
  filter_categories: z.array(z.string()).default(['entertainment']),
  notification_enabled: z.boolean().default(true),
  daily_digest: z.boolean().default(true),
  digest_time: z.string().default('08:00'),
});

// 用户 Schema
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  preferences: UserPreferencesSchema.optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

// 新闻 Schema
export const NewsQuerySchema = z.object({
  category: z.string().optional(),
  country: z.string().length(2).optional(),
  language: z.string().length(2).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  q: z.string().optional(),
});

// 聊天请求 Schema
export const ChatRequestSchema = z.object({
  newsId: z.string().uuid('Invalid news ID'),
  question: z.string().min(1, 'Question is required'),
  conversationId: z.string().uuid().optional(),
});

// API Key 设置 Schema
export const SetApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required').startsWith('sk-ant-', 'Invalid Anthropic API Key format'),
});

// 收藏 Schema
export const CreateBookmarkSchema = z.object({
  newsId: z.string().uuid('Invalid news ID'),
  notes: z.string().max(1000).optional(),
});

// 用户设置更新 Schema
export const UpdatePreferencesSchema = UserPreferencesSchema.partial();

export type UserPreferencesInput = z.infer<typeof UserPreferencesSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type NewsQueryInput = z.infer<typeof NewsQuerySchema>;
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
export type SetApiKeyInput = z.infer<typeof SetApiKeySchema>;
export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;
