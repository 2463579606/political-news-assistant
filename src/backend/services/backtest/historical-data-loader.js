/**
 * Historical Data Loader
 * 历史数据加载器
 *
 * 功能:
 * 1. 加载指定日期范围的历史数据
 * 2. 按日期分组数据
 * 3. 获取交易日历
 */

const { Pool } = require('pg');

class HistoricalDataLoader {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 加载指定日期范围的历史数据
   * @param {string} stockCode - 股票代码
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   */
  async loadHistoricalData(stockCode, startDate, endDate) {
    try {
      console.log(`📊 加载历史数据: ${stockCode} (${startDate} ~ ${endDate})`);

      // 并行加载各类数据
      const [marketData, fundFlow, newsEvents] = await Promise.all([
        this.loadMarketData(stockCode, startDate, endDate),
        this.loadFundFlow(stockCode, startDate, endDate),
        this.loadNewsEvents(stockCode, startDate, endDate)
      ]);

      // 按日期分组
      const groupedData = this.groupByDate({
        marketData,
        fundFlow,
        newsEvents
      });

      console.log(`✅ 市场数据: ${marketData.length}条`);
      console.log(`✅ 资金流向: ${fundFlow.length}条`);
      console.log(`✅ 新闻事件: ${newsEvents.length}条`);

      return {
        stockCode,
        startDate,
        endDate,
        marketData,
        fundFlow,
        newsEvents,
        groupedData,
        tradingDays: Object.keys(groupedData).sort()
      };

    } catch (error) {
      console.error('加载历史数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 加载市场数据（K线）
   */
  async loadMarketData(stockCode, startDate, endDate) {
    const query = `
      SELECT
        trade_date,
        open_price,
        close_price,
        high_price,
        low_price,
        volume,
        amount,
        ma5, ma10, ma20, ma60,
        macd, macd_signal, macd_hist,
        rsi6, rsi12, rsi24,
        kdj_k, kdj_d, kdj_j,
        boll_upper, boll_mid, boll_lower
      FROM market_data
      WHERE stock_code = $1
        AND trade_date::date >= $2::date
        AND trade_date::date <= $3::date
      ORDER BY trade_date ASC
    `;

    const result = await this.pool.query(query, [stockCode, startDate, endDate]);
    return result.rows;
  }

  /**
   * 加载资金流向数据
   */
  async loadFundFlow(stockCode, startDate, endDate) {
    const query = `
      SELECT
        trade_date,
        main_inflow, main_outflow, main_net, main_net_ratio,
        superlarge_inflow, superlarge_outflow, superlarge_net,
        large_inflow, large_outflow, large_net,
        medium_inflow, medium_outflow, medium_net,
        small_inflow, small_outflow, small_net
      FROM fund_flow
      WHERE stock_code = $1
        AND trade_date::date >= $2::date
        AND trade_date::date <= $3::date
      ORDER BY trade_date ASC
    `;

    const result = await this.pool.query(query, [stockCode, startDate, endDate]);
    return result.rows;
  }

  /**
   * 加载新闻事件
   */
  async loadNewsEvents(stockCode, startDate, endDate) {
    const query = `
      SELECT
        id,
        title,
        event_type,
        importance_score,
        sentiment,
        sentiment_score,
        impact_stocks,
        impact_sectors,
        created_at
      FROM news_events
      WHERE impact_stocks::jsonb ? $1
        AND created_at::date >= $2
        AND created_at::date <= $3
      ORDER BY created_at ASC
    `;

    const result = await this.pool.query(query, [stockCode, startDate, endDate]);
    return result.rows;
  }

  /**
   * 按日期分组数据
   */
  groupByDate(data) {
    const { marketData, fundFlow, newsEvents } = data;
    const grouped = {};

    // 初始化：从市场数据中提取所有日期
    marketData.forEach(row => {
      const date = row.trade_date;
      grouped[date] = {
        date: date,
        market: row,
        fund: null,
        news: []
      };
    });

    // 添加资金流向数据
    fundFlow.forEach(row => {
      const date = row.trade_date;
      if (grouped[date]) {
        grouped[date].fund = row;
      }
    });

    // 添加新闻事件（按日期归类）
    newsEvents.forEach(event => {
      const date = event.created_at.toISOString().split('T')[0];
      if (grouped[date]) {
        grouped[date].news.push(event);
      }
    });

    return grouped;
  }

  /**
   * 获取交易日历（排除周末和节假日）
   */
  async getTradingDays(startDate, endDate) {
    const query = `
      SELECT DISTINCT trade_date
      FROM market_data
      WHERE trade_date >= $1
        AND trade_date <= $2
      ORDER BY trade_date ASC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows.map(row => row.trade_date);
  }

  /**
   * 获取指定日期的数据
   */
  getDataForDate(groupedData, date) {
    return groupedData[date] || {
      date: date,
      market: null,
      fund: null,
      news: []
    };
  }

  /**
   * 批量加载多只股票的历史数据
   */
  async batchLoadHistoricalData(stockCodes, startDate, endDate) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const data = await this.loadHistoricalData(stockCode, startDate, endDate);
        results.push({
          success: true,
          stockCode: stockCode,
          data: data
        });

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.push({
          success: false,
          stockCode: stockCode,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取数据完整性报告
   */
  getDataCompletenessReport(data) {
    const { marketData, fundFlow, newsEvents, startDate, endDate } = data;

    // 计算应该有的交易日数量
    const totalDays = this.calculateTradingDays(startDate, endDate);

    return {
      marketData: {
        total: totalDays,
        actual: marketData.length,
        completeness: (marketData.length / totalDays * 100).toFixed(2) + '%'
      },
      fundFlow: {
        total: totalDays,
        actual: fundFlow.length,
        completeness: (fundFlow.length / totalDays * 100).toFixed(2) + '%'
      },
      newsEvents: {
        total: newsEvents.length,
        actual: newsEvents.length,
        completeness: '100%'
      },
      overall: {
        marketComplete: marketData.length >= totalDays * 0.95,
        fundComplete: fundFlow.length >= totalDays * 0.8,
        canBacktest: marketData.length >= totalDays * 0.95
      }
    };
  }

  /**
   * 计算交易日数量（估算）
   */
  calculateTradingDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 估算交易日约为总天数的70%（排除周末和节假日）
    return Math.floor(diffDays * 0.7);
  }
}

module.exports = HistoricalDataLoader;
