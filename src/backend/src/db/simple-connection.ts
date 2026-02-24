// 简化的数据库连接 - 移除 better-sqlite3 依赖
// 使用内存存储进行演示

interface NewsItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  sourceName: string;
  publishedAt: string;
  importanceScore?: number;
  category?: string;
  keywords?: string[];
}

// 内存存储
const memoryStore = {
  news: [] as NewsItem[],
  users: [
    { id: '1', email: 'demo@example.com', name: 'Demo User' }
  ],
};

export const db = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => memoryStore[table].filter((item: any) => {
        for (const key in condition) {
          if ((item as any)[key] !== condition[key]) return false;
        }
        return true;
      })
    }),
    limit: (n: number) => ({
      then: (fn: any) => fn(memoryStore)
    })
  }),

  insert: (table: any) => ({
    values: (data: any) => {
      if (!memoryStore[table]) memoryStore[table] = [];
      memoryStore[table].push(data);
      return data;
    }
  }),

  update: (table: any) => ({
    set: (data: any) => {
      if (!memoryStore[table]) memoryStore[table] = [];
      memoryStore[table] = data;
    }
  })
  })
};

// 初始化演示数据
export async function initDemoData() {
  console.log('Initializing demo data...');

  // 演示新闻
  memoryStore.news = [
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
  ];

  console.log('Demo data initialized');
}

export type { NewsItem };
