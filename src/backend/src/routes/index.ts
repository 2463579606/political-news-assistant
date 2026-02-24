// ============================================
// Routes Index - 路由聚合
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { newsRoutes } from './news';
import { aiRoutes } from './ai';
import { userRoutes } from './user';

const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// 健康检查
app.get('/', (c) => {
  return c.json({
    name: 'Political News Assistant API',
    version: '1.0.0',
    status: 'ok',
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.route('/api/v1/news', newsRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/user', userRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
