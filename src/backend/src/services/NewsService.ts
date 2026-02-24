// ============================================
// News Service - 新闻业务逻辑
// ============================================

import { db, news, categories } from '../db/connection';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { cache } from '../lib/cache';
import { NEWS_SOURCES, CATEGORY_MAP } from '../lib/config';
import { NewsListParams, NewsListResponse } from '@pna/shared';

interface FetchParams {
  category?: string;
  country?: string;
  language?: string;
  q?: string;
  pageSize?: number;
  page?: number;
}

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

class NewsService {
  /**
   * 从 NewsAPI 获取新闻
   */
  private async fetchFromNewsAPI(params: FetchParams): Promise<NewsAPIArticle[]> {
    const { category, country, language, q, pageSize = 50, page = 1 } = params;

    // 构建查询参数
    const queryParams = new URLSearchParams({
      apiKey: NEWS_SOURCES.newsapi.apiKey || '',
      pageSize: pageSize.toString(),
      page: page.toString(),
    });

    if (category) queryParams.append('category', category);
    if (country) queryParams.append('country', country);
    if (language) queryParams.append('language', language);
    if (q) queryParams.append('q', q);

    try {
      const response = await fetch(
        `${NEWS_SOURCES.newsapi.baseUrl}/top-headlines?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.status}`);
      }

      return data.articles;
    } catch (error) {
      console.error('Failed to fetch from NewsAPI:', error);
      return [];
    }
  }

  /**
   * 将 NewsAPI 文章转换为数据库格式
   */
  private async mapToDbSchema(article: NewsAPIArticle): Promise<typeof news.$inferInsert> {
    // 查找或创建分类
    let categoryId: string | undefined;
    // 这里简单处理，实际可以根据 source.name 或 content 分析分类

    // 计算重要性评分（简单实现：基于关键词）
    const importanceScore = this.calculateImportance(article.title, article.description);

    // 提取关键词
    const keywords = this.extractKeywords(article.title, article.description);

    return {
      newsApiId: `${article.source.id}-${article.url}`, // 生成唯一ID
      title: article.title,
      url: article.url,
      urlToImage: article.urlToImage,
      content: article.content,
      description: article.description,
      sourceName: article.source.name,
      sourceId: article.source.id || undefined,
      author: article.author,
      publishedAt: new Date(article.publishedAt),
      categoryId,
      importanceScore: importanceScore.toString(),
      keywords,
    };
  }

  /**
   * 计算新闻重要性 (0-1)
   */
  private calculateImportance(title: string, description: string | null): number {
    const importantKeywords = [
      'breaking', 'urgent', 'alert', 'crisis', 'summit', 'election',
      'breaking', '突发', '紧急', '重要', '峰会', '选举',
    ];

    const text = `${title} ${description || ''}`.toLowerCase();
    const matches = importantKeywords.filter(kw => text.includes(kw)).length;

    // 基础分 0.3，每个关键词加 0.1，最高 1.0
    return Math.min(0.3 + matches * 0.1, 1.0);
  }

  /**
   * 提取关键词
   */
  private extractKeywords(title: string, description: string | null): string[] {
    const text = `${title} ${description || ''}`;
    // 简单实现：提取常见的专有名词
    // 实际应该使用 NLP 库
    const keywords: string[] = [];

    // 匹配大写开头的词（可能是专有名词）
    const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
    keywords.push(...words.slice(0, 5));

    return [...new Set(keywords)];
  }

  /**
   * 过滤新闻
   */
  private shouldFilterOut(article: NewsAPIArticle): boolean {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    // 过滤娱乐类（虽然分类不会请求，但内容可能混合）
    const entertainmentKeywords = ['celebrity', 'entertainment', 'gossip', '娱乐', '明星'];
    const hasEntertainment = entertainmentKeywords.some(kw => text.includes(kw));
    if (hasEntertainment) return true;

    return false;
  }

  /**
   * 抓取并保存新闻
   */
  async fetchAndSave(params: FetchParams): Promise<number> {
    // 检查缓存
    const cacheKey = `news:fetch:${JSON.stringify(params)}`;
    const cached = await cache.get<number>(cacheKey);
    if (cached) return cached;

    // 从 NewsAPI 获取
    const articles = await this.fetchFromNewsAPI(params);

    // 过滤
    const filtered = articles.filter(a => !this.shouldFilterOut(a));

    // 保存到数据库
    let savedCount = 0;
    for (const article of filtered) {
      try {
        const newsData = await this.mapToDbSchema(article);

        // 使用 upsert 避免重复
        await db.insert(news).values(newsData).onConflictDoNothing({
          target: news.newsApiId,
        });

        savedCount++;
      } catch (error) {
        console.error('Failed to save news:', error);
      }
    }

    // 缓存结果（5分钟）
    await cache.set(cacheKey, savedCount, '5m');

    return savedCount;
  }

  /**
   * 获取新闻列表
   */
  async getNewsList(params: NewsListParams): Promise<NewsListResponse> {
    const {
      category,
      country,
      page = 1,
      limit = 20,
      from,
      to,
      q,
    } = params;

    // 检查缓存
    const cacheKey = `news:list:${JSON.stringify(params)}`;
    const cached = await cache.get<NewsListResponse>(cacheKey);
    if (cached) return cached;

    // 构建查询条件
    const conditions: any[] = [];

    if (from) conditions.push(gte(news.publishedAt, new Date(from)));
    if (to) conditions.push(lte(news.publishedAt, new Date(to)));
    if (country) conditions.push(eq(news.country, country));
    // TODO: 分类、搜索等

    // 查询总数
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(news)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 查询数据
    const data = await db
      .select()
      .from(news)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(news.importanceScore), desc(news.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const result: NewsListResponse = {
      data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };

    // 缓存结果（5分钟）
    await cache.set(cacheKey, result, '5m');

    return result;
  }

  /**
   * 获取新闻详情
   */
  async getNewsById(id: string) {
    const cacheKey = `news:detail:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const [item] = await db.select().from(news).where(eq(news.id, id)).limit(1);

    if (item) {
      await cache.set(cacheKey, item, '30m');
    }

    return item;
  }

  /**
   * 获取每日简报
   */
  async getDailyBrief(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const items = await db
      .select()
      .from(news)
      .where(
        and(
          gte(news.publishedAt, startOfDay),
          lte(news.publishedAt, endOfDay),
          sql`${news.importanceScore} >= 0.7`
        )
      )
      .orderBy(desc(news.importanceScore), desc(news.publishedAt))
      .limit(20);

    return items;
  }

  /**
   * 搜索新闻
   */
  async searchNews(query: string, limit = 20) {
    // 使用全文搜索
    const results = await db.execute(sql`
      SELECT *
      FROM news
      WHERE
        to_tsvector('english', title || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', ${query})
      ORDER BY importance_score DESC, published_at DESC
      LIMIT ${limit}
    `);

    return results.rows;
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await cache.delPattern('news:*');
  }
}

export const newsService = new NewsService();
