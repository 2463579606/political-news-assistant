// ============================================
// 共享类型定义 - 时政新闻助手
// ============================================

// User 相关类型
export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  filter_keywords: string[];
  filter_sources: string[];
  filter_categories: string[];
  notification_enabled: boolean;
  daily_digest: boolean;
  digest_time: string;
}

// News 相关类型
export interface News {
  id: string;
  newsApiId?: string;
  title: string;
  url: string;
  urlToImage?: string;
  images?: string[]; // 新闻图片数组
  content?: string;
  description?: string;
  summaryAi?: string;
  sourceName: string;
  sourceId?: string;
  author?: string;
  publishedAt: Date | string;
  categoryId?: string;
  category?: string;
  categorySlug?: string;
  country?: string;
  language?: string;
  importance?: number;
  importanceScore?: number;
  keywords?: string[];
  isBreaking?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

// Conversation 相关类型
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export interface Conversation {
  id: string;
  user_id: string;
  news_id?: string;
  title: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

// Bookmark 相关类型
export interface Bookmark {
  id: string;
  user_id: string;
  news_id: string;
  notes?: string;
  created_at: Date;
  news?: News;
}

// Reading History 相关类型
export interface ReadingHistory {
  id: string;
  user_id: string;
  news_id: string;
  viewed_at: Date;
  read_duration: number;
  news?: News;
}

// API 请求/响应类型
export interface NewsListParams {
  category?: string;
  country?: string;
  language?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  q?: string;
}

export interface NewsListResponse {
  data: News[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ChatRequest {
  newsId: string;
  question: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  answer: string;
  sources: string[];
  timestamp: Date;
}

export interface DailyBrief {
  date: string;
  summary: string;
  news: Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    importance: number;
  }>;
}

// 错误类型
export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

// 新闻源配置（可扩展）
export interface NewsSourceConfig {
  name: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
}

// AI 模型配置（可扩展）
export interface AIModelConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  model: string;
  apiKey?: string;
  baseURL?: string;
}
