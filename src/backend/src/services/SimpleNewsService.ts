// 简化的新闻服务 - 使用内存存储
import { db, initDemoData } from '../db/simple-connection';

interface NewsListParams {
  page?: number;
  limit?: number;
  category?: string;
}

export class NewsService {
  async fetchAndSave(params: NewsListParams) {
    console.log('NewsService.fetchAndSave called with:', params);
    return 5; // 返回保存的数量
  }

  async getNewsList(params: NewsListParams) {
    const { page = 1, limit = 20 } = params;

    // 从内存存储获取
    const items = db.select()
      .from(memoryStore.news)
      .limit(limit)
      .then((data: any[]) => data.slice((page - 1) * limit, page * limit));

    return {
      data: items,
      pagination: {
        total: memoryStore.news.length,
        page,
        limit,
        totalPages: Math.ceil(memoryStore.news.length / limit),
      },
    };
  }

  async getNewsById(id: string) {
    const items = db.select()
      .from(memoryStore.news)
      .where((item: any) => (item as any).id === id)
      .limit(1)
      .then((data: any[]) => data[0] || null);

    return items;
  }

  async getDailyBrief(date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const items = db.select()
      .from(memoryStore.news)
      .where((item: any) => new Date((item as any).publishedAt) >= startOfDay)
      .limit(20);

    const brief = this.generateBriefText(items);

    return items;
  }

  private generateBriefText(items: any[]): string {
    if (items.length === 0) {
      return '今日暂无重要新闻。';
    }

    const byCategory = items.reduce((acc, item) => {
      const cat = item.category || '其他';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    let brief = `📰 **AI 每日简报** | ${new Date().toLocaleDateString('zh-CN')}\n\n`;

    // 时政
    if (byCategory['时政']) {
      brief += `🏛️ **时政要闻**\n`;
      brief += byCategory['时政'].slice(0, 3).map((item: any) =>
        `• ${item.title?.slice(0, 30)}...`
      ).join('\n');
      brief += `\n`;
    }

    // 财经
    if (byCategory['财经']) {
      brief += `💰 **财经动态**\n`;
      brief += byCategory['财经'].slice(0, 3).map((item: any) =>
        `• ${item.title?.slice(0, 30)}...`
      ).join('\n');
      brief += `\n`;
    }

    // 科技
    if (byCategory['科技']) {
      brief += `🤖 **科技创新**\n`;
      brief += byCategory['科技'].slice(0, 3).map((item: any) =>
        `• ${item.title?.slice(0, 30)}...`
      ).join('\n');
      brief += `\n`;
    }

    // 国际
    if (byCategory['国际']) {
      brief += `🌍 **国际关注**\n`;
      brief += byCategory['国际'].slice(0, 3).map((item: any) =>
        `• ${item.title?.slice(0, 30)}...`
      ).join('\n');
    }

    brief += `\n---\n> 本简报由 AI 自动生成，仅供参考。`;

    return brief;
  }

  async clearCache() {
    // 无操作，内存存储不需要清除
    console.log('Cache cleared (no-op for memory store)');
  }
}

export const newsService = new NewsService();
