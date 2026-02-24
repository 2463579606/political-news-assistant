// ============================================
// AI Routes - AI 相关 API
// ============================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ChatRequestSchema } from '@pna/shared';
import { aiService } from '../services/AIService';

const aiRoutes = new Hono();

/**
 * POST /ai/ask-news
 * 对新闻进行追问
 */
aiRoutes.post('/ask-news', zValidator('json', ChatRequestSchema), async (c) => {
  const { newsId, question, conversationId } = c.req.valid('json');

  // TODO: 从 JWT 或 session 获取 userId
  // MVP 阶段暂时使用请求头
  const userId = c.req.header('x-user-id') || 'demo-user';

  try {
    const result = await aiService.chatAboutNews({
      userId,
      newsId,
      question,
      conversationId,
    });

    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /ai/summary
 * 生成新闻摘要
 */
aiRoutes.post('/summary/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const summary = await aiService.generateSummary(id);
    return c.json({ summary });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /ai/daily-brief
 * 获取 AI 生成的每日简报
 */
aiRoutes.get('/daily-brief', async (c) => {
  const date = c.req.query('date')
    ? new Date(c.req.query('date')!)
    : new Date();

  try {
    const brief = await aiService.generateDailyBrief(date);
    return c.json({
      date: date.toISOString().split('T')[0],
      brief,
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { aiRoutes };
