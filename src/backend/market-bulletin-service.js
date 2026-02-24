/**
 * 真实股市公告服务
 * 基于真实市场数据生成公告
 */

const realTimeMarketService = require('./real-time-market-service');

class MarketBulletinService {
  constructor() {
    this.cache = null;
    this.lastUpdate = 0;
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 生成每日股市公告（基于真实数据）
   */
  async generateDailyBulletin() {
    const now = Date.now();

    // 检查缓存
    if (this.cache && now - this.lastUpdate < this.cacheTimeout) {
      console.log('使用缓存的股市公告');
      return this.cache;
    }

    console.log('生成最新股市公告...');

    try {
      // 获取真实市场数据
      const marketData = await realTimeMarketService.getAllIndices();
      const sectors = await realTimeMarketService.getHotSectors();
      const sentiment = await realTimeMarketService.getMarketSentiment();
      const stats = await realTimeMarketService.getMarketStats();

      const a股指数 = marketData.markets?.A股?.indices || [];
      const 上证指数 = a股指数.find(i => i.code === '000001') || a股指数[0];
      const 深证成指 = a股指数.find(i => i.code === '399001');
      const 创业板指 = a股指数.find(i => i.code === '399006');

      // 计算市场表现
      const riseCount = stats.riseCount || 0;
      const fallCount = stats.fallCount || 0;
      const flatCount = stats.flatCount || 0;
      const totalStocks = riseCount + fallCount + flatCount;

      const risePercent = totalStocks > 0 ? ((riseCount / totalStocks) * 100).toFixed(2) : 0;

      // 热门板块分析
      const hotSectors = (sectors.sectors || []).slice(0, 5).map(sector => ({
        sector: sector.name,
        logic: `${sector.name}板块今日表现强势，涨跌幅${sector.changePercent}%`,
        strength: sector.changePercent > 5 ? 'S' : sector.changePercent > 3 ? 'A' : 'B',
        changePercent: sector.changePercent,
        targetStocks: ['相关龙头股'], // TODO: 从真实数据获取龙头股
        entryPoint: '等待回调至5日均线附近介入',
        exitPoint: '冲高回落时获利了结',
        stopLoss: '跌破5日均线止损'
      }));

      // 市场状态判断
      const marketStatus = 上证指数.changePercent > 0 ? '上涨' :
                          上证指数.changePercent < -1 ? '下跌' : '震荡';

      const sentimentText = sentiment.sentiment || '中性';
      const sentimentScore = sentiment.sentimentScore || 50;

      // 生成市场概览
      const marketOverview = `今日A股市场${上证指数.changePercent >= 0 ? '上涨' : '下跌'}${Math.abs(上证指数.changePercent).toFixed(2)}%，上证指数报${上证指数.price.toFixed(2)}点${上证指数.changePercent >= 0 ? '，' : '，。'}深证成指${深证成指 ?深证成指.price.toFixed(2) + '点，' : ''}创业板指${创业板指 ? 创业板指.price.toFixed(2) + '点。' : ''}

市场情绪${sentimentText}，情绪指数${sentimentScore}分${sentimentScore > 70 ? '，市场情绪乐观' : sentimentScore < 30 ? '，市场情绪悲观' : '。'}

资金面方面，${riseCount}只个股上涨，${fallCount}只下跌${flatCount > 0 ? '，' + flatCount + '只平盘' : ''}。上涨个股占比${risePercent}%。

${上证指数.isClosed ? `【${上证指数.marketStatusLabel}】当前市场休市，以上为${上证指数.lastTradeDate}的收盘数据。` : ''}`;

      // 投资建议
      const suggestions = [];

      if (上证指数.changePercent > 1) {
        suggestions.push('市场普涨，建议关注量能配合情况，谨慎追高');
      } else if (上证指数.changePercent < -1) {
        suggestions.push('市场调整，建议控制仓位，等待企稳信号');
      } else {
        suggestions.push('市场震荡，建议精选个股，关注结构性机会');
      }

      if (hotSectors.length > 0) {
        suggestions.push(`关注${hotSectors[0].sector}等热点板块的轮动机会`);
      }

      if (上证指数.isClosed) {
        suggestions.push('休市期间建议关注国内外重要资讯和宏观政策动向');
      }

      // 构建响应
      const bulletin = {
        marketOverview,
        hotSectors,
        indexData: {
          上证指数: {
            name: 上证指数.name,
            price: 上证指数.price,
            change: 上证指数.change,
            changePercent: 上证指数.changePercent
          },
          深证成指: 深证成指 ? {
            name: 深证成指.name,
            price: 深证成指.price,
            change: 深证成指.change,
            changePercent: 深证成指.changePercent
          } : null,
          创业板指: 创业板指 ? {
            name: 创业板指.name,
            price: 创业板指.price,
            change: 创业板指.change,
            changePercent: 创业板指.changePercent
          } : null
        },
        marketStats: {
          riseCount,
          fallCount,
          flatCount,
          risePercent
        },
        sentiment: {
          text: sentimentText,
          score: sentimentScore
        },
        suggestions,
        dataTime: 上证指数.lastTradeDate || 上证指数.dataTime,
        isMarketClosed: 上证指数.isClosed || false,
        marketStatusLabel: 上证指数.marketStatusLabel || '交易中',
        dataSource: 上证指数.dataSource || '东方财富网',
        official: 上证指数.official || false
      };

      // 更新缓存
      this.cache = bulletin;
      this.lastUpdate = now;

      console.log('股市公告生成成功');
      return bulletin;
    } catch (error) {
      console.error('生成股市公告失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      lastUpdate: new Date(this.lastUpdate).toISOString(),
      cacheAge: Date.now() - this.lastUpdate,
      hasCachedData: !!this.cache
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache = null;
    this.lastUpdate = 0;
    console.log('股市公告缓存已清除');
  }
}

module.exports = new MarketBulletinService();
