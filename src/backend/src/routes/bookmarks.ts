// Bookmarks Routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CreateBookmarkSchema } from '@pna/shared';

const bookmarkRoutes = new Hono();

// 获取收藏列表
bookmarkRoutes.get('/', async (c) => {
  // TODO: 从 JWT 或 session 获取 userId
  const userId = c.req.header('x-user-id') || 'demo-user';

  const bookmarks = [
    {
      id: '1',
      userId,
      newsId: '1',
      createdAt: new Date().toISOString(),
      news: {
        id: '1',
        title: '国际货币基金组织批准最新改革方案',
        url: '#',
        description: 'IMF理事会批准了一系列改革措施，旨在增强新兴市场和发展中国家的代表权...',
        sourceName: '财经时报',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
      }
    },
    {
      id: '2',
      userId,
      newsId: '2',
      notes: '重点关注',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      news: {
        id: '2',
        title: '科技巨头发布新一代AI模型',
        url: '#',
        description: '主要科技公司宣布推出更强大、更安全的人工智能模型，将改变行业格局...',
        sourceName: '科技日报',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
      }
    },
  ];

  return c.json(bookmarks);
});

// 添加收藏
bookmarkRoutes.post('/', zValidator('json', CreateBookmarkSchema), async (c) => {
  const { newsId, notes } = c.req.valid('json');

  // TODO: 从 JWT 或 session 获取 userId
  const userId = c.req.header('x-user-id') || 'demo-user';

  const newBookmark = {
    id: Date.now().toString(),
    userId,
    newsId,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  return c.json(newBookmark, 201);
});

// 取消收藏
bookmarkRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // TODO: 验证用户权限
  // TODO: 从数据库删除

  return c.json({ success: true, message: `Bookmark ${id} deleted` });
});

export { bookmarkRoutes };
