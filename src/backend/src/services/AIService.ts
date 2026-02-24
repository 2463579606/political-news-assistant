// ============================================
// AI Service - Claude API 集成
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { db, news, users, conversations } from '../db/connection';
import { eq, and, desc } from 'drizzle-orm';
import { cache } from '../lib/cache';
import { decrypt } from '../lib/crypto';
import { AI_CONFIG } from '../lib/config';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatAboutNewsParams {
  userId: string;
  newsId: string;
  question: string;
  conversationId?: string;
}

class AIService {
  private getClaudeClient(apiKey: string): Anthropic {
    return new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: false,
    });
  }

  /**
   * 获取用户的 Claude API Key
   */
  private async getUserApiKey(userId: string): Promise<string> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.claudeApiKeyEncrypted) {
      throw new Error('Claude API Key not configured for user');
    }

    return decrypt(user.claudeApiKeyEncrypted);
  }

  /**
   * 生成新闻摘要
   */
  async generateSummary(newsId: string): Promise<string> {
    // 检查缓存
    const cacheKey = `ai:summary:${newsId}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) return cached;

    // 获取新闻
    const [item] = await db.select().from(news).where(eq(news.id, newsId)).limit(1);
    if (!item) throw new Error('News not found');

    // 这里使用系统级别的 API Key（如果配置）
    // 或者在参数中传入用户ID使用用户自己的 Key
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API Key not configured');
    }

    const client = this.getClaudeClient(apiKey);

    const prompt = `请用1-2句话总结这篇新闻的主要内容。

标题：${item.title}
发布时间：${item.publishedAt}
来源：${item.sourceName}
内容：${item.content || item.description || '无内容'}

要求：
- 简洁、准确、客观
- 突出核心信息
- 不要添加个人观点
- 使用中文回复`;

    try {
      const response = await client.messages.create({
        model: AI_CONFIG.anthropic.model,
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      });

      const summary = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // 缓存摘要（24小时）
      await cache.set(cacheKey, summary, '24h');

      // 更新到数据库
      await db
        .update(news)
        .set({ summaryAi: summary, updatedAt: new Date() })
        .where(eq(news.id, newsId));

      return summary;
    } catch (error) {
      console.error('Failed to generate summary:', error);
      throw error;
    }
  }

  /**
   * 生成每日简报
   */
  async generateDailyBrief(date: Date = new Date()): Promise<string> {
    const cacheKey = `ai:daily-brief:${date.toISOString().split('T')[0]}`;
    const cached = await cache.get<string>(cacheKey);
    if (cached) return cached;

    // 获取当日重要新闻
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const items = await db
      .select()
      .from(news)
      .where(
        and(
          sql`DATE(${news.publishedAt}) = ${date.toISOString().split('T')[0]}`,
          sql`${news.importanceScore} >= 0.6`
        )
      )
      .orderBy(desc(news.importanceScore))
      .limit(20);

    if (items.length === 0) {
      return '今日暂无重要新闻。';
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API Key not configured');
    }

    const client = this.getClaudeClient(apiKey);

    const newsList = items.map((item, i) =>
      `${i + 1}. [${item.sourceName}] ${item.title}\n   ${item.description || item.content || ''}`
    ).join('\n\n');

    const prompt = `请根据以下新闻列表生成一份每日简报。

${newsList}

要求：
- 按主题分类（时政、财经、科技、国际）
- 每个主题选择2-3条最重要的新闻
- 每条新闻用1句话总结
- 简明扼要，便于快速阅读
- 使用中文回复

格式示例：
📰 每日简报 | ${date.toLocaleDateString('zh-CN')}

🏛️ 时政
• XXX...

💰 财经
• XXX...
`;

    try {
      const response = await client.messages.create({
        model: AI_CONFIG.anthropic.model,
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const brief = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // 缓存简报（24小时）
      await cache.set(cacheKey, brief, '24h');

      return brief;
    } catch (error) {
      console.error('Failed to generate daily brief:', error);
      throw error;
    }
  }

  /**
   * 对新闻进行追问对话
   */
  async chatAboutNews(params: ChatAboutNewsParams): Promise<{
    conversationId: string;
    answer: string;
    sources: string[];
  }> {
    const { userId, newsId, question, conversationId } = params;

    // 获取用户 API Key
    let userApiKey: string;
    try {
      userApiKey = await this.getUserApiKey(userId);
    } catch {
      throw new Error('请先在设置中配置 Claude API Key');
    }

    // 获取新闻
    const [newsItem] = await db.select().from(news).where(eq(news.id, newsId)).limit(1);
    if (!newsItem) throw new Error('News not found');

    const client = this.getClaudeClient(userApiKey);

    // 获取或创建对话
    let conversationIdToUse = conversationId;
    let messages: ChatMessage[] = [];

    if (conversationId) {
      // 获取现有对话历史
      const [conv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, userId)
          )
        )
        .limit(1);

      if (conv) {
        messages = conv.messages as ChatMessage[];
        conversationIdToUse = conv.id;
      }
    }

    // 构建系统提示
    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `你是一个专业的新闻助手，基于以下新闻回答用户问题。

新闻标题：${newsItem.title}
发布时间：${newsItem.publishedAt}
来源：${newsItem.sourceName}
内容：${newsItem.content || newsItem.description}
关键词：${newsItem.keywords.join('、')}

指导原则：
1. 基于新闻内容回答问题
2. 如果问题超出新闻范围，可以使用你的知识库，但请明确说明哪些是新闻内容，哪些是你的补充
3. 保持客观、准确的立场
4. 如果不确定，请诚实告知
5. 使用中文回复`,
    };

    // 添加新问题
    messages.push({ role: 'user', content: question });

    try {
      const response = await client.messages.create({
        model: AI_CONFIG.anthropic.model,
        max_tokens: 2000,
        messages: [systemPrompt, ...messages],
      });

      const answer = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // 添加回复到历史
      messages.push({ role: 'assistant', content: answer, timestamp: new Date() });

      // 保存或更新对话
      const now = new Date();
      if (!conversationIdToUse) {
        const title = question.slice(0, 50) + (question.length > 50 ? '...' : '');
        const [newConv] = await db
          .insert(conversations)
          .values({
            userId,
            newsId,
            title,
            messages: messages as any,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        conversationIdToUse = newConv.id;
      } else {
        await db
          .update(conversations)
          .set({
            messages: messages as any,
            updatedAt: now,
          })
          .where(eq(conversations.id, conversationIdToUse));
      }

      return {
        conversationId: conversationIdToUse,
        answer,
        sources: [newsItem.url],
      };
    } catch (error) {
      console.error('Failed to chat about news:', error);

      // 检查是否是 API Key 错误
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Claude API Key 无效，请检查设置');
      }

      throw error;
    }
  }

  /**
   * 流式对话（未来扩展）
   */
  async *chatAboutNewsStream(
    params: ChatAboutNewsParams
  ): AsyncGenerator<string, void, unknown> {
    // TODO: 实现流式响应
    throw new Error('Streaming not implemented yet');
  }
}

export const aiService = new AIService();
