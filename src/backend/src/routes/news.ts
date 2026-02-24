// ============================================
// News Routes - 新闻相关 API
// ============================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { NewsQuerySchema } from '@pna/shared';
import { newsService } from '../services/NewsService';

const newsRoutes = new Hono();

// 获取新闻列表
newsRoutes.get('/', zValidator('query', NewsQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const result = await newsService.getNewsList(query);
  return c.json(result);
});

// 获取新闻详情
newsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const item = await newsService.getNewsById(id);

  if (!item) {
    return c.json({ error: 'News not found' }, 404);
  }

  return c.json(item);
});

// 获取每日简报
newsRoutes.get('/daily/brief', async (c) => {
  const date = c.req.query('date')
    ? new Date(c.req.query('date')!)
    : new Date();

  const brief = await newsService.getDailyBrief(date);
  return c.json({ date, items: brief });
});

// 搜索新闻
newsRoutes.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  const results = await newsService.searchNews(query);
  return c.json({ data: results });
});

export { newsRoutes };
