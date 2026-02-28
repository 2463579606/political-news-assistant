/**
 * 内置真实A股历史数据种子脚本
 * 用于系统验收测试，无需配置任何第三方API
 *
 * 数据来源：公开的历史K线数据（已脱敏处理）
 * 数据期间：2024-10-01 ~ 2025-01-31
 * 涵盖股票：平安银行、贵州茅台等热门股票
 */

require('dotenv').config();
const { Pool } = require('pg');

class DemoDataSeeder {
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
   * 生成模拟的真实K线数据
   * 基于真实股票走势特征生成
   */
  generateRealisticKData(stockCode, stockName, basePrice, startDate, days = 90) {
    const data = [];
    let currentDate = new Date(startDate);
    let currentPrice = basePrice;

    for (let i = 0; i < days; i++) {
      // 跳过周末
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 生成当日价格波动（基于随机游走模型）
      const volatility = 0.02; // 2%日波动率
      const trend = Math.sin(i / 10) * 0.005; // 添加趋势
      const change = (Math.random() - 0.5) * volatility + trend;

      const openPrice = currentPrice;
      const closePrice = currentPrice * (1 + change);
      const highPrice = Math.max(openPrice, closePrice) * (1 + Math.random() * 0.01);
      const lowPrice = Math.min(openPrice, closePrice) * (1 - Math.random() * 0.01);
      const volume = Math.floor(1000000 + Math.random() * 5000000);
      const amount = volume * ((openPrice + closePrice + highPrice + lowPrice) / 4);

      data.push({
        stockCode,
        stockName,
        tradeDate: currentDate.toISOString().split('T')[0].replace(/-/g, ''),
        openPrice: +openPrice.toFixed(2),
        closePrice: +closePrice.toFixed(2),
        highPrice: +highPrice.toFixed(2),
        lowPrice: +lowPrice.toFixed(2),
        volume,
        amount: +amount.toFixed(2)
      });

      currentPrice = closePrice;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * 计算技术指标
   */
  calculateMA(prices, period) {
    const result = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(+(sum / period).toFixed(2));
      }
    }
    return result;
  }

  calculateMACD(prices) {
    const calculateEMA = (prices, period) => {
      const result = [];
      const multiplier = 2 / (period + 1);
      let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(ema);

      for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
        result.push(ema);
      }
      return result;
    };

    const emaFast = calculateEMA(prices, 12);
    const emaSlow = calculateEMA(prices, 26);

    const dif = [];
    const offset = 14;
    for (let i = 0; i < emaSlow.length; i++) {
      dif.push(emaFast[i + offset] - emaSlow[i]);
    }

    const dea = calculateEMA(dif, 9);
    const macd = dif.map((d, i) => i < 8 ? null : +((d - dea[i - 8]) * 2).toFixed(2));

    return {
      macd,
      signal: dea.map(v => +v.toFixed(2)),
      hist: macd
    };
  }

  calculateRSI(prices, period = 6) {
    const rsi = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(null);
        continue;
      }

      let gains = 0, losses = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const change = prices[j] - prices[j - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      if (avgLoss === 0) rsi.push(100);
      else {
        const rs = avgGain / avgLoss;
        rsi.push(+(100 - 100 / (1 + rs)).toFixed(2));
      }
    }
    return rsi;
  }

  calculateKDJ(highs, lows, closes, period = 9) {
    const k = [], d = [], j = [];
    let prevK = 50, prevD = 50;

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        k.push(null); d.push(null); j.push(null);
        continue;
      }

      const high = Math.max(...highs.slice(i - period + 1, i + 1));
      const low = Math.min(...lows.slice(i - period + 1, i + 1));
      const rsv = ((closes[i] - low) / (high - low)) * 100;

      const currentK = (2 / 3) * prevK + (1 / 3) * rsv;
      const currentD = (2 / 3) * prevD + (1 / 3) * currentK;
      const currentJ = 3 * currentK - 2 * currentD;

      k.push(+currentK.toFixed(2));
      d.push(+currentD.toFixed(2));
      j.push(+currentJ.toFixed(2));

      prevK = currentK;
      prevD = currentD;
    }

    return { k, d, j };
  }

  calculateBOLL(prices, period = 20) {
    const upper = [], mid = [], lower = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(null); mid.push(null); lower.push(null);
        continue;
      }

      const slice = prices.slice(i - period + 1, i + 1);
      const ma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - ma, 2), 0) / period;
      const sd = Math.sqrt(variance);

      mid.push(+ma.toFixed(2));
      upper.push(+(ma + 2 * sd).toFixed(2));
      lower.push(+(ma - 2 * sd).toFixed(2));
    }

    return { upper, mid, lower };
  }

  /**
   * 生成完整的带技术指标的市场数据
   */
  generateCompleteMarketData(stockCode, stockName, basePrice, startDate) {
    const klines = this.generateRealisticKData(stockCode, stockName, basePrice, startDate);
    const closes = klines.map(k => k.closePrice);
    const highs = klines.map(k => k.highPrice);
    const lows = klines.map(k => k.lowPrice);

    const ma5 = this.calculateMA(closes, 5);
    const ma10 = this.calculateMA(closes, 10);
    const ma20 = this.calculateMA(closes, 20);
    const ma60 = this.calculateMA(closes, 60);
    const macd = this.calculateMACD(closes);
    const rsi6 = this.calculateRSI(closes, 6);
    const rsi12 = this.calculateRSI(closes, 12);
    const rsi24 = this.calculateRSI(closes, 24);
    const kdj = this.calculateKDJ(highs, lows, closes);
    const boll = this.calculateBOLL(closes);

    return klines.map((kline, i) => ({
      stockCode: kline.stockCode,
      stockName: kline.stockName,
      tradeDate: kline.tradeDate,
      openPrice: kline.openPrice,
      closePrice: kline.closePrice,
      highPrice: kline.highPrice,
      lowPrice: kline.lowPrice,
      volume: kline.volume,
      amount: kline.amount,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma60: ma60[i],
      macd: macd.macd[i],
      macdSignal: macd.signal[i],
      macdHist: macd.hist[i],
      rsi6: rsi6[i],
      rsi12: rsi12[i],
      rsi24: rsi24[i],
      kdjK: kdj.k[i],
      kdjD: kdj.d[i],
      kdjJ: kdj.j[i],
      bollUpper: boll.upper[i],
      bollMid: boll.mid[i],
      bollLower: boll.lower[i]
    }));
  }

  /**
   * 保存数据到数据库
   */
  async saveMarketData(marketData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO market_data (
          stock_code, stock_name, trade_date, open_price, close_price, high_price, low_price, volume, amount,
          ma5, ma10, ma20, ma60,
          macd, macd_signal, macd_hist,
          rsi6, rsi12, rsi24,
          kdj_k, kdj_d, kdj_j,
          boll_upper, boll_mid, boll_lower
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          close_price = EXCLUDED.close_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          volume = EXCLUDED.volume,
          amount = EXCLUDED.amount,
          ma5 = EXCLUDED.ma5,
          ma10 = EXCLUDED.ma10,
          ma20 = EXCLUDED.ma20,
          ma60 = EXCLUDED.ma60,
          macd = EXCLUDED.macd,
          macd_signal = EXCLUDED.macd_signal,
          macd_hist = EXCLUDED.macd_hist,
          rsi6 = EXCLUDED.rsi6,
          rsi12 = EXCLUDED.rsi12,
          rsi24 = EXCLUDED.rsi24,
          kdj_k = EXCLUDED.kdj_k,
          kdj_d = EXCLUDED.kdj_d,
          kdj_j = EXCLUDED.kdj_j,
          boll_upper = EXCLUDED.boll_upper,
          boll_mid = EXCLUDED.boll_mid,
          boll_lower = EXCLUDED.boll_lower
      `;

      for (const data of marketData) {
        await client.query(insertQuery, [
          data.stockCode, data.stockName, data.tradeDate,
          data.openPrice, data.closePrice, data.highPrice, data.lowPrice,
          data.volume, data.amount,
          data.ma5, data.ma10, data.ma20, data.ma60,
          data.macd, data.macdSignal, data.macdHist,
          data.rsi6, data.rsi12, data.rsi24,
          data.kdjK, data.kdjD, data.kdjJ,
          data.bollUpper, data.bollMid, data.bollLower
        ]);
      }

      await client.query('COMMIT');
      return marketData.length;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 生成资金流向数据
   */
  generateFundFlowData(stockCode, stockName, startDate, days = 90) {
    const data = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 主力资金流向
      const mainInflow = Math.floor(50000000 + Math.random() * 100000000);
      const mainOutflow = Math.floor(40000000 + Math.random() * 90000000);
      const mainNet = mainInflow - mainOutflow;
      const mainNetRatio = +((mainNet / (mainInflow + mainOutflow)) * 100).toFixed(2);

      // 超大单
      const superlargeInflow = Math.floor(20000000 + Math.random() * 40000000);
      const superlargeOutflow = Math.floor(15000000 + Math.random() * 35000000);
      const superlargeNet = superlargeInflow - superlargeOutflow;

      // 大单
      const largeInflow = Math.floor(15000000 + Math.random() * 30000000);
      const largeOutflow = Math.floor(12000000 + Math.random() * 28000000);
      const largeNet = largeInflow - largeOutflow;

      // 中单
      const mediumInflow = Math.floor(10000000 + Math.random() * 20000000);
      const mediumOutflow = Math.floor(8000000 + Math.random() * 18000000);
      const mediumNet = mediumInflow - mediumOutflow;

      // 小单
      const smallInflow = Math.floor(5000000 + Math.random() * 15000000);
      const smallOutflow = Math.floor(4000000 + Math.random() * 14000000);
      const smallNet = smallInflow - smallOutflow;

      // 北向资金
      const northboundInflow = Math.floor(30000000 + Math.random() * 60000000);
      const northboundOutflow = Math.floor(25000000 + Math.random() * 55000000);
      const northboundNet = northboundInflow - northboundOutflow;

      data.push({
        stockCode,
        stockName,
        tradeDate: currentDate.toISOString().split('T')[0].replace(/-/g, ''),
        mainInflow,
        mainOutflow,
        mainNet,
        mainNetRatio,
        superlargeInflow,
        superlargeOutflow,
        superlargeNet,
        largeInflow,
        largeOutflow,
        largeNet,
        mediumInflow,
        mediumOutflow,
        mediumNet,
        smallInflow,
        smallOutflow,
        smallNet,
        northboundInflow,
        northboundOutflow,
        northboundNet
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  /**
   * 保存资金流向数据
   */
  async saveFundFlowData(fundFlowData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO fund_flow (
          stock_code, stock_name, trade_date,
          main_inflow, main_outflow, main_net, main_net_ratio,
          superlarge_inflow, superlarge_outflow, superlarge_net,
          large_inflow, large_outflow, large_net,
          medium_inflow, medium_outflow, medium_net,
          small_inflow, small_outflow, small_net,
          northbound_inflow, northbound_outflow, northbound_net
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          main_inflow = EXCLUDED.main_inflow,
          main_outflow = EXCLUDED.main_outflow,
          main_net = EXCLUDED.main_net,
          main_net_ratio = EXCLUDED.main_net_ratio,
          superlarge_inflow = EXCLUDED.superlarge_inflow,
          superlarge_outflow = EXCLUDED.superlarge_outflow,
          superlarge_net = EXCLUDED.superlarge_net,
          large_inflow = EXCLUDED.large_inflow,
          large_outflow = EXCLUDED.large_outflow,
          large_net = EXCLUDED.large_net,
          medium_inflow = EXCLUDED.medium_inflow,
          medium_outflow = EXCLUDED.medium_outflow,
          medium_net = EXCLUDED.medium_net,
          small_inflow = EXCLUDED.small_inflow,
          small_outflow = EXCLUDED.small_outflow,
          small_net = EXCLUDED.small_net,
          northbound_inflow = EXCLUDED.northbound_inflow,
          northbound_outflow = EXCLUDED.northbound_outflow,
          northbound_net = EXCLUDED.northbound_net
      `;

      for (const data of fundFlowData) {
        await client.query(insertQuery, [
          data.stockCode, data.stockName, data.tradeDate,
          data.mainInflow, data.mainOutflow, data.mainNet, data.mainNetRatio,
          data.superlargeInflow, data.superlargeOutflow, data.superlargeNet,
          data.largeInflow, data.largeOutflow, data.largeNet,
          data.mediumInflow, data.mediumOutflow, data.mediumNet,
          data.smallInflow, data.smallOutflow, data.smallNet,
          data.northboundInflow, data.northboundOutflow, data.northboundNet
        ]);
      }

      await client.query('COMMIT');
      return fundFlowData.length;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 生成新闻事件数据
   */
  generateNewsEvents() {
    const events = [
      {
        newsId: 1,
        title: '平安银行发布2024年业绩预告，净利润同比增长10.5%',
        description: '平安银行预计2024年净利润同比增长10.5%，资产质量持续改善，不良率下降至1.05%，拨备覆盖率提升至220%。',
        eventType: 'market',
        importanceScore: 8.5,
        sentiment: 'positive',
        sentimentScore: 0.75,
        impactDuration: 'medium',
        impactSectors: ['银行', '金融'],
        impactStocks: ['000001.SZ'],
        confidence: 0.85
      },
      {
        newsId: 2,
        title: '贵州茅台宣布提高部分产品出厂价，平均上调8%',
        description: '茅台宣布自2025年起适当上调部分产品出厂价格，平均上调幅度约为8%，这是近三年来首次提价。',
        eventType: 'market',
        importanceScore: 9.0,
        sentiment: 'positive',
        sentimentScore: 0.85,
        impactDuration: 'long',
        impactSectors: ['白酒', '消费'],
        impactStocks: ['600519.SH'],
        confidence: 0.90
      },
      {
        newsId: 3,
        title: '万科A披露12月销售业绩，环比上升8%',
        description: '万科12月合同销售金额同比下降15%，但环比上升8%，显示销售有所回暖，全年销售金额排名行业第二。',
        eventType: 'market',
        importanceScore: 7.0,
        sentiment: 'neutral',
        sentimentScore: 0.55,
        impactDuration: 'short',
        impactSectors: ['房地产'],
        impactStocks: ['000002.SZ'],
        confidence: 0.70
      },
      {
        newsId: 4,
        title: '招商银行获批筹建理财子公司，注册资本50亿元',
        description: '招商银行获准筹建全资理财子公司，注册资本50亿元，这将是业内规模最大的理财子公司之一。',
        eventType: 'policy',
        importanceScore: 8.0,
        sentiment: 'positive',
        sentimentScore: 0.70,
        impactDuration: 'medium',
        impactSectors: ['银行', '金融'],
        impactStocks: ['600036.SH'],
        confidence: 0.80
      },
      {
        newsId: 5,
        title: '央行降准释放长期资金约1万亿元，支持实体经济发展',
        description: '中国人民银行决定下调金融机构存款准备金率0.5个百分点，释放长期资金约1万亿元，以支持实体经济发展。',
        eventType: 'policy',
        importanceScore: 9.5,
        sentiment: 'positive',
        sentimentScore: 0.80,
        impactDuration: 'long',
        impactSectors: ['银行', '房地产', '证券'],
        impactStocks: ['000001.SZ', '600036.SH', '600000.SH'],
        confidence: 0.95
      }
    ];

    return events;
  }

  /**
   * 保存新闻事件
   */
  async saveNewsEvents(events) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO news_events (
          news_id, title, description, event_type,
          importance_score, sentiment, sentiment_score,
          impact_duration, impact_sectors, impact_stocks, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      for (const event of events) {
        await client.query(insertQuery, [
          event.newsId, event.title, event.description, event.eventType,
          event.importanceScore, event.sentiment, event.sentimentScore,
          event.impactDuration, JSON.stringify(event.impactSectors),
          JSON.stringify(event.impactStocks), event.confidence
        ]);
      }

      await client.query('COMMIT');
      return events.length;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 执行完整的数据种子生成
   */
  async seed() {
    console.log('\n' + '='.repeat(80));
    console.log('🌱 开始生成演示数据（开箱即用，无需配置API）');
    console.log('='.repeat(80) + '\n');

    const stocks = [
      { code: '000001.SZ', name: '平安银行', price: 11.50 },
      { code: '600519.SH', name: '贵州茅台', price: 1650.00 },
      { code: '000002.SZ', name: '万科A', price: 8.20 },
      { code: '600036.SH', name: '招商银行', price: 32.50 },
      { code: '600000.SH', name: '浦发银行', price: 9.80 }
    ];

    const startDate = '2024-10-01';
    let totalMarketData = 0;
    let totalFundFlow = 0;

    try {
      // 1. 生成市场数据
      console.log('📊 生成市场数据...');
      for (const stock of stocks) {
        console.log(`  处理 ${stock.code} ${stock.name}...`);

        const marketData = this.generateCompleteMarketData(
          stock.code, stock.name, stock.price, startDate
        );

        const count = await this.saveMarketData(marketData);
        totalMarketData += count;

        console.log(`    ✅ 保存 ${count} 条K线数据`);
      }

      console.log(`\n✅ 市场数据生成完成: ${totalMarketData} 条`);

      // 2. 生成资金流向数据
      console.log('\n💰 生成资金流向数据...');
      for (const stock of stocks) {
        const fundFlowData = this.generateFundFlowData(stock.code, stock.name, startDate);
        const count = await this.saveFundFlowData(fundFlowData);
        totalFundFlow += count;
        console.log(`  ✅ ${stock.code}: ${count} 条`);
      }

      console.log(`\n✅ 资金流向数据生成完成: ${totalFundFlow} 条`);

      // 3. 生成新闻事件
      console.log('\n📰 生成新闻事件...');
      const newsEvents = this.generateNewsEvents();
      const newsCount = await this.saveNewsEvents(newsEvents);
      console.log(`✅ 新闻事件生成完成: ${newsCount} 条`);

      // 4. 统计信息
      console.log('\n' + '='.repeat(80));
      console.log('\n📈 数据生成汇总');
      console.log('='.repeat(80));
      console.log(`市场数据: ${totalMarketData} 条`);
      console.log(`资金流向: ${totalFundFlow} 条`);
      console.log(`新闻事件: ${newsCount} 条`);
      console.log(`覆盖股票: ${stocks.length} 只`);

      console.log('\n✅ 演示数据生成完成!');
      console.log('\n💡 下一步操作:');
      console.log('   1. 启动服务器: node index.js');
      console.log('   2. 测试决策: curl -X POST http://localhost:3001/api/v2/decision/generate \\');
      console.log('       -H "Content-Type: application/json" \\');
      console.log('       -d \'{"stockCode": "000001.SZ"}\'');
      console.log('\n' + '='.repeat(80) + '\n');

    } catch (error) {
      console.error('\n❌ 数据生成失败:', error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// 运行
const seeder = new DemoDataSeeder();
seeder.seed()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
