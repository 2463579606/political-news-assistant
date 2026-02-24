// News Routes - 使用简化服务
import { Hono } from 'hono';

const newsRoutes = new Hono();

// 模拟新闻数据
const mockNews = [
  {
    id: '1',
    title: '国际货币基金组织批准最新改革方案',
    url: '#',
    description: 'IMF理事会批准了一系列改革措施，旨在增强新兴市场和发展中国家的代表权...',
    sourceName: '财经时报',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    importanceScore: 0.85,
    category: '财经',
  },
  {
    id: '2',
    title: '科技巨头发布新一代AI模型',
    url: '#',
    description: '主要科技公司宣布推出更强大、更安全的人工智能模型，将改变行业格局...',
    sourceName: '科技日报',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    importanceScore: 0.78,
    category: '科技',
  },
  {
    id: '3',
    title: '联合国召开气候变化紧急会议',
    url: '#',
    description: '针对全球极端天气频发，联合国召集各国代表商讨应对措施...',
    sourceName: '环球时报',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    importanceScore: 0.92,
    category: '国际',
  },
];

// 获取新闻列表
newsRoutes.get('/', (c) => {
  const query = c.req.query();
  const page = parseInt(query.page || '1');
  const limit = parseInt(query.limit || '20');

  const start = (page - 1) * limit;
  const items = mockNews.slice(start, start + limit);

  return c.json({
    data: items,
    pagination: {
      total: mockNews.length,
      page,
      limit,
      totalPages: Math.ceil(mockNews.length / limit),
    },
  });
});

// 获取新闻详情
newsRoutes.get('/:id', (c) => {
  const id = c.req.param('id');
  const item = mockNews.find(n => n.id === id);

  if (!item) {
    return c.json({ error: 'News not found' }, 404);
  }

  return c.json(item);
});

// 每日简报
newsRoutes.get('/daily/brief', (c) => {
  const today = new Date().toISOString().split('T')[0];

  const brief = `📰 **AI 每日简报** | ${new Date().toLocaleDateString('zh-CN')}

🏛️ **时政要闻**
• 国际货币基金组织批准最新改革方案
• 科技巨头发布新一代AI模型
• 联合国召开气候变化紧急会议

💰 **财经动态**
• 央行降息刺激经济增长
• 国际峰会达成贸易协定

🌍 **国际关注**
• 极端天气频发引发全球关注

---

> 本简报由 AI 自动生成，仅供参考。`;

  return c.json({ date: today, items: brief });
});

// 搜索
newsRoutes.get('/search', (c) => {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ data: [] });
  }

  const filtered = mockNews.filter(n =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.description?.toLowerCase().includes(query.toLowerCase())
  );

  return c.json({ data: filtered });
});

export { newsRoutes };
