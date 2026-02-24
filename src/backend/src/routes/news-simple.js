import { Hono } from "hono"

const app = new Hono()

// Mock data for demo
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
    keywords: ['IMF', '改革', '国际金融'],
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
    keywords: ['AI', '科技', '机器学习'],
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
    keywords: ['联合国', '气候变化', '环境'],
  },
  {
    id: '4',
    title: '央行降息刺激经济增长',
    url: '#',
    description: '央行宣布下调基准利率25个基点，旨在提振市场信心和促进投资...',
    sourceName: '财经周刊',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    importanceScore: 0.88,
    category: '财经',
    keywords: ['央行', '降息', '经济'],
  },
  {
    id: '5',
    title: '国际峰会达成贸易协定',
    url: '#',
    description: '多国贸易会议圆满结束，主要经济体就降低关税壁垒达成共识...',
    sourceName: '国际新闻',
    publishedAt: new Date(Date.now() - 18000000).toISOString(),
    importanceScore: 0.75,
    category: '时政',
    keywords: ['贸易', '国际', '协定'],
  },
]

// Get news list
app.get('/api/v1/news', (c) => {
  const query = c.req.query()
  const page = parseInt(query.page || '1')
  const limit = parseInt(query.limit || '20')

  const start = (page - 1) * limit
  const items = mockNews.slice(start, start + limit)

  return c.json({
    data: items,
    pagination: {
      total: mockNews.length,
      page,
      limit,
      totalPages: Math.ceil(mockNews.length / limit),
    },
  })
})

// Get news by ID
app.get('/api/v1/news/:id', (c) => {
  const id = c.req.param('id')
  const item = mockNews.find((n) => n.id === id)

  if (!item) {
    return c.json({ error: 'Not found' }, 404)
  }

  return c.json(item)
})

// Daily brief
const mockBrief = `📰 **AI 每日简报** | ${new Date().toLocaleDateString('zh-CN')}

🏛️ **时政要闻**
• 国际货币基金组织批准最新改革方案
• 央行降息刺激经济增长
• 国际峰会达成贸易协定

💰 **财经动态**
• 科技巨头发布新一代AI模型

🌍 **国际关注**
• 联合国召开气候变化紧急会议

---

> 本简报由 AI 自动生成，仅供参考。`

app.get('/api/v1/ai/daily-brief', (c) => {
  return c.json({
    date: new Date().toISOString().split('T')[0],
    brief: mockBrief,
  })
})

// Search
app.get('/api/v1/news/search', (c) => {
  const query = c.req.query('q')
  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400)
  }

  const filtered = mockNews.filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.description?.toLowerCase().includes(query.toLowerCase())
  )

  return c.json({ data: filtered })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Root
app.get('/', (c) => {
  return c.json({
    name: 'Political News Assistant API',
    version: '1.0.0-demo',
    status: 'ok',
    demoMode: true,
  })
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  )
})

export default app
