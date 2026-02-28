/**
 * Backtest Engine
 * 回测引擎
 *
 * 功能:
 * 1. 配置回测参数
 * 2. 运行历史回测
 * 3. 批量回测
 * 4. 保存回测结果
 */

const HistoricalDataLoader = require('./historical-data-loader');
const TradeSimulator = require('./trade-simulator');
const PerformanceAnalyzer = require('./performance-analyzer');
const DecisionEngine = require('../decision/decision-engine');
const { Pool } = require('pg');

class BacktestEngine {
  constructor() {
    this.dataLoader = new HistoricalDataLoader();
    this.analyzer = new PerformanceAnalyzer();
    this.decisionEngine = new DecisionEngine();

    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 运行回测
   * @param {string} stockCode - 股票代码
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @param {Object} options - 回测配置
   */
  async runBacktest(stockCode, startDate, endDate, options = {}) {
    try {
      console.log('\n' + '='.repeat(70));
      console.log(`🚀 开始回测: ${stockCode}`);
      console.log(`   日期范围: ${startDate} ~ ${endDate}`);
      console.log('='.repeat(70));

      // 默认配置
      const config = {
        initialCapital: 1000000,    // 初始资金 100万
        commissionRate: 0.0003,     // 手续费率 0.03%
        slippageRate: 0.001,        // 滑点率 0.1%
        maxPosition: 0.3,           // 最大仓位 30%
        stopLoss: -0.08,            // 止损 -8%
        takeProfit: 0.15,           // 止盈 +15%
        saveToDb: false,            // 是否保存到数据库
        ...options
      };

      // 1. 加载历史数据
      console.log('\n📊 步骤 1/5: 加载历史数据');
      const historicalData = await this.dataLoader.loadHistoricalData(
        stockCode,
        startDate,
        endDate
      );

      const dataCompleteness = this.dataLoader.getDataCompletenessReport(historicalData);
      console.log('\n数据完整性:');
      console.log(`  市场数据: ${dataCompleteness.marketData.completeness}`);
      console.log(`  资金流向: ${dataCompleteness.fundFlow.completeness}`);
      console.log(`  新闻事件: ${dataCompleteness.newsEvents.completeness}`);

      if (!dataCompleteness.overall.canBacktest) {
        throw new Error('市场数据不完整，无法进行回测');
      }

      // 2. 初始化交易模拟器
      console.log('\n💰 步骤 2/5: 初始化交易模拟器');
      const simulator = new TradeSimulator(config);

      // 3. 逐日模拟
      console.log('\n📈 步骤 3/5: 逐日模拟交易');
      const { trades, equityCurve, dailyReturns } = await this.simulateTrading(
        historicalData,
        simulator,
        config
      );

      // 4. 计算绩效指标
      console.log('\n📊 步骤 4/5: 计算绩效指标');
      const backtestResult = {
        stockCode: stockCode,
        startDate: startDate,
        endDate: endDate,
        config: config,
        initialCapital: config.initialCapital,
        finalCapital: simulator.getTotalEquity(
          historicalData.marketData[historicalData.marketData.length - 1].close_price
        ),
        trades: trades,
        equityCurve: equityCurve,
        dailyReturns: dailyReturns
      };

      const performance = this.analyzer.analyze(backtestResult);
      backtestResult.performance = performance;

      // 5. 保存结果
      if (config.saveToDb) {
        console.log('\n💾 步骤 5/5: 保存回测结果');
        await this.saveBacktestResult(backtestResult);
      } else {
        console.log('\n✅ 步骤 5/5: 回测完成');
      }

      // 打印摘要
      this.printSummary(backtestResult);

      console.log('\n' + '='.repeat(70));
      console.log(`✅ 回测完成: ${stockCode}`);
      console.log('='.repeat(70) + '\n');

      return backtestResult;

    } catch (error) {
      console.error(`\n❌ 回测失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 模拟交易过程
   */
  async simulateTrading(historicalData, simulator, config) {
    const { groupedData, tradingDays, stockCode, marketData } = historicalData;
    const trades = [];
    const equityCurve = [];
    const dailyReturns = [];

    // 计算技术指标
    const enrichedMarketData = this.calculateTechnicalIndicators(marketData);

    // 重新按日期分组（使用与原始数据相同的日期格式）
    const enrichedGroupedData = {};
    enrichedMarketData.forEach(day => {
      // 保持原始日期格式
      const dateKey = day.trade_date;

      if (!enrichedGroupedData[dateKey]) {
        enrichedGroupedData[dateKey] = {
          date: dateKey,
          market: day,
          fund: groupedData[dateKey]?.fund || null,
          news: groupedData[dateKey]?.news || []
        };
      } else {
        // 更新已有的market对象
        enrichedGroupedData[dateKey].market = day;
      }
    });

    let prevEquity = config.initialCapital;

    console.log(`\n交易日期: ${tradingDays.length}个交易日`);
    console.log('─'.repeat(70));

    // 遍历每个交易日
    for (let i = 0; i < tradingDays.length; i++) {
      const date = tradingDays[i];
      const dayData = enrichedGroupedData[date];

      if (!dayData.market) {
        continue;
      }

      const { close_price } = dayData.market;
      const equity = simulator.getTotalEquity(close_price);

      // 记录资金曲线
      equityCurve.push({
        date: date,
        equity: equity,
        price: close_price,
        position: simulator.position,
        cash: simulator.cash
      });

      // 计算日收益率
      if (prevEquity > 0) {
        dailyReturns.push((equity - prevEquity) / prevEquity);
      }
      prevEquity = equity;

      // 生成决策（简化版：基于技术指标）
      const shouldMakeDecision = this.shouldMakeDecision(dayData, i, tradingDays.length);

      if (shouldMakeDecision) {
        try {
          // 使用简化的决策逻辑（基于实时计算的技术指标）
          const decision = this.generateHistoricalDecision(dayData, i, tradingDays, enrichedMarketData);

          // 执行交易
          const trade = simulator.executeDecision(decision, close_price, date);

          if (trade) {
            trades.push(trade);
          }

        } catch (error) {
          // 决策生成失败，跳过
          console.log(`⚠️  ${date}: 决策生成失败 - ${error.message}`);
        }
      }

      // 每隔一定天数打印进度
      if (i % 10 === 0 || i === tradingDays.length - 1) {
        const progress = ((i + 1) / tradingDays.length * 100).toFixed(1);
        console.log(`   进度: ${progress}% (${date}) 资金: ¥${equity.toLocaleString()} 持仓: ${simulator.position > 0 ? 'YES' : 'NO'}`);
      }
    }

    console.log('─'.repeat(70));
    console.log(`\n交易汇总:`);
    console.log(`  总交易次数: ${trades.length}`);
    console.log(`  买入次数: ${trades.filter(t => t.tradeType === 'BUY').length}`);
    console.log(`  卖出次数: ${trades.filter(t => t.tradeType === 'SELL').length}`);

    return { trades, equityCurve, dailyReturns };
  }

  /**
   * 计算技术指标
   */
  calculateTechnicalIndicators(marketData) {
    const enriched = [...marketData];

    // 按日期排序
    enriched.sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date));

    // 计算移动平均线
    for (let i = 0; i < enriched.length; i++) {
      const close = parseFloat(enriched[i].close_price);

      // MA5
      if (i >= 4) {
        const sum5 = enriched.slice(i - 4, i + 1).reduce((sum, d) => sum + parseFloat(d.close_price), 0);
        enriched[i].ma5 = sum5 / 5;
      }

      // MA10
      if (i >= 9) {
        const sum10 = enriched.slice(i - 9, i + 1).reduce((sum, d) => sum + parseFloat(d.close_price), 0);
        enriched[i].ma10 = sum10 / 10;
      }

      // MA20
      if (i >= 19) {
        const sum20 = enriched.slice(i - 19, i + 1).reduce((sum, d) => sum + parseFloat(d.close_price), 0);
        enriched[i].ma20 = sum20 / 20;
      }

      // RSI6 (简化版)
      if (i >= 6) {
        let gains = 0, losses = 0;
        for (let j = i - 5; j <= i; j++) {
          const change = parseFloat(enriched[j].close_price) - parseFloat(enriched[j - 1].close_price);
          if (change > 0) gains += change;
          else losses -= change;
        }
        const avgGain = gains / 6;
        const avgLoss = losses / 6;
        if (avgLoss > 0) {
          enriched[i].rsi6 = 100 - (100 / (1 + avgGain / avgLoss));
        } else {
          enriched[i].rsi6 = 100;
        }
      }

      // 简化的MACD
      if (i >= 12 && enriched[i].ma5 && enriched[i - 1].ma5) {
        const ema12 = this.calculateEMA(enriched, i, 12);
        const ema26 = this.calculateEMA(enriched, i, 26);
        enriched[i].macd = ema12 - ema26;

        if (i >= 26) {
          const macdValues = enriched.slice(Math.max(0, i - 8), i + 1).map(d => d.macd || 0);
          enriched[i].macd_signal = macdValues.reduce((a, b) => a + b, 0) / macdValues.length;
        }
      }
    }

    return enriched;
  }

  /**
   * 计算EMA
   */
  calculateEMA(data, index, period) {
    const multiplier = 2 / (period + 1);
    let ema = parseFloat(data[index].close_price);

    for (let i = index; i >= Math.max(0, index - period); i--) {
      ema = (parseFloat(data[i].close_price) - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * 基于历史数据生成决策（优化版 - 更保守更准确）
   */
  generateHistoricalDecision(dayData, dayIndex, totalDays, marketData) {
    const market = dayData.market;

    if (!market) {
      return { decision: 'HOLD', confidence: 0.5, reason: '无市场数据' };
    }

    let score = 0;
    let signals = [];

    // 1. 趋势确认 (MA) - 必须MA5 > MA20才考虑买入
    if (market.ma5 && market.ma20) {
      if (market.ma5 > market.ma20) {
        score += 3; // 提高趋势权重
        signals.push('MA5>MA20');
      } else {
        score -= 3;
        signals.push('MA5<MA20');
        // 趋势向下，不买入
        if (score <= -3) {
          return { decision: 'HOLD', confidence: 0.3, reason: '趋势向下,观望' };
        }
      }
    }

    // 2. 动量信号 (RSI) - 更严格的标准
    if (market.rsi6) {
      if (market.rsi6 < 35) { // 从30改为35，更严格
        score += 4; // 提高超卖权重
        signals.push(`RSI超卖(${market.rsi6.toFixed(0)})`);
      } else if (market.rsi6 > 65) { // 从70改为65，更早止盈
        score -= 3;
        signals.push(`RSI超买(${market.rsi6.toFixed(0)})`);
        // RSI超买，考虑卖出
        if (score <= 0) {
          return { decision: 'HOLD', confidence: 0.4, reason: 'RSI超买,等待' };
        }
      }
    }

    // 3. MACD信号 - 金叉确认
    if (market.macd && market.macd_signal) {
      if (market.macd > market.macd_signal) {
        score += 2;
        signals.push('MACD金叉');
      } else {
        score -= 2;
        signals.push('MACD死叉');
      }
    }

    // 4. 价格位置 - 在MA20下方更安全
    if (market.close_price && market.ma20) {
      const closePrice = parseFloat(market.close_price);
      const ma20 = parseFloat(market.ma20);
      const deviation = (closePrice - ma20) / ma20;

      if (deviation < -0.02) {
        // 价格低于MA20 2%，超跌， safer买入点
        score += 3;
        signals.push('价格超跌');
      } else if (deviation > 0.03) {
        // 价格高于MA20 3%，考虑止盈
        score -= 2;
        signals.push('价格偏离过高');
      }
    }

    // 5. 成交量确认 (可选)
    if (market.volume && dayIndex > 0) {
      const prevVolume = marketData[dayIndex - 1]?.volume;
      if (prevVolume && market.volume > prevVolume * 1.2) {
        // 成交量放大20%以上
        score += 1;
        signals.push('成交量放大');
      }
    }

    // 6. 最后一天强制平仓
    if (dayIndex === totalDays - 1) {
      return { decision: 'SELL', confidence: 1.0, reason: '回测结束,强制平仓' };
    }

    // 转换为决策 - 提高阈值，减少交易
    let decision;
    let confidence;

    if (score >= 8) { // 从5提高到8
      decision = 'STRONG_BUY';
      confidence = 0.85;
    } else if (score >= 5) { // 从2提高到5
      decision = 'BUY';
      confidence = 0.75;
    } else if (score <= -6) { // 从-5降低到-6
      decision = 'STRONG_SELL';
      confidence = 0.80;
    } else if (score <= -3) { // 从-2降低到-3
      decision = 'SELL';
      confidence = 0.70;
    } else {
      decision = 'HOLD';
      confidence = 0.5;
    }

    return {
      decision,
      confidence,
      reason: signals.join(', ') || '中性信号'
    };
  }

  /**
   * 判断是否应该生成决策
   */
  shouldMakeDecision(dayData, dayIndex, totalDays) {
    // 第一天必须生成决策
    if (dayIndex === 0) {
      return true;
    }

    // 最后一天必须平仓
    if (dayIndex === totalDays - 1) {
      return true;
    }

    // 有重要新闻时
    if (dayData.news && dayData.news.length > 0) {
      const importantNews = dayData.news.filter(n => n.importance_score >= 7);
      if (importantNews.length > 0) {
        return true;
      }
    }

    // 每隔7天生成一次决策
    if (dayIndex % 7 === 0) {
      return true;
    }

    return false;
  }

  /**
   * 打印回测摘要
   */
  printSummary(result) {
    const { performance, trades } = result;

    console.log('\n' + '─'.repeat(70));
    console.log('📊 回测结果摘要');
    console.log('─'.repeat(70));

    console.log('\n💰 收益指标:');
    console.log(`  总收益率:  ${performance.return.totalReturnPercent}`);
    console.log(`  年化收益:  ${performance.return.annualReturnPercent}`);
    console.log(`  总盈利:    ¥${performance.return.profit.toLocaleString()}`);

    console.log('\n⚠️  风险指标:');
    console.log(`  最大回撤:  ${performance.risk.maxDrawdownPercent}`);
    console.log(`  波动率:    ${performance.risk.volatilityPercent}`);
    console.log(`  夏普比率:  ${performance.risk.sharpeRatio.toFixed(2)}`);
    console.log(`  索提诺比率: ${performance.risk.sortinoRatio.toFixed(2)}`);

    console.log('\n📈 交易指标:');
    console.log(`  总交易:    ${performance.trade.totalTrades}次`);
    console.log(`  完成交易:  ${performance.trade.completedTrades}次`);
    console.log(`  胜率:      ${performance.trade.winRatePercent}`);
    console.log(`  盈亏比:    ${performance.trade.profitLossRatio.toFixed(2)}`);
    console.log(`  平均盈利:  ${performance.trade.avgWinPercent}`);
    console.log(`  平均亏损:  ${performance.trade.avgLossPercent}`);
    console.log(`  盈利因子:  ${performance.trade.profitFactor.toFixed(2)}`);
    console.log(`  最大盈利:  ¥${performance.trade.largestWin.toLocaleString()}`);
    console.log(`  最大亏损:  ¥${performance.trade.largestLoss.toLocaleString()}`);
    console.log(`  平均持仓:  ${performance.trade.avgHoldingPeriod.toFixed(0)}天`);

    console.log('\n' + '─'.repeat(70));
  }

  /**
   * 保存回测结果到数据库
   */
  async saveBacktestResult(result) {
    const { stockCode, startDate, endDate, initialCapital, finalCapital, performance, config } = result;

    // 计算年化收益率
    const annualReturn = performance.return.annualReturn;

    // 插入回测结果
    const query = `
      INSERT INTO backtest_results (
        stock_code, start_date, end_date,
        initial_capital, final_capital,
        total_return, annual_return,
        max_drawdown, sharpe_ratio, sortino_ratio, calmar_ratio,
        win_rate, profit_loss_ratio,
        total_trades, win_trades, loss_trades,
        avg_win, avg_loss, largest_win, largest_loss, avg_holding_period,
        parameters, metrics, equity_curve, daily_returns
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id
    `;

    const values = [
      stockCode,
      startDate,
      endDate,
      initialCapital,
      finalCapital,
      performance.return.totalReturn,
      annualReturn,
      typeof performance.risk.maxDrawdown === 'object'
        ? performance.risk.maxDrawdown.value
        : performance.risk.maxDrawdown,
      performance.risk.sharpeRatio,
      performance.risk.sortinoRatio,
      performance.risk.calmarRatio,
      performance.trade.winRate,
      performance.trade.profitLossRatio,
      performance.trade.totalTrades,
      performance.trade.winTrades,
      performance.trade.lossTrades,
      performance.trade.avgWin,
      performance.trade.avgLoss,
      performance.trade.largestWin,
      performance.trade.largestLoss,
      performance.trade.avgHoldingPeriod,
      JSON.stringify(config),
      JSON.stringify(performance),
      JSON.stringify(result.equityCurve),
      JSON.stringify(result.dailyReturns)
    ];

    const dbResult = await this.pool.query(query, values);
    const backtestId = dbResult.rows[0].id;

    // 保存交易记录
    for (const trade of result.trades) {
      await this.pool.query(
        `INSERT INTO backtest_trades (
          backtest_id, stock_code, trade_type, trade_date,
          price, quantity, amount, commission, slippage,
          reason, decision_type, profit, profit_percent, holding_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          backtestId,
          trade.stockCode,
          trade.tradeType,
          trade.tradeDate,
          trade.price,
          trade.quantity,
          trade.amount,
          trade.commission,
          trade.slippage,
          trade.reason,
          trade.decisionType,
          trade.profit || null,
          trade.profitPercent || null,
          null // TODO: 计算持仓天数
        ]
      );
    }

    console.log(`\n✅ 回测结果已保存 (ID: ${backtestId})`);

    return backtestId;
  }

  /**
   * 批量回测
   */
  async batchBacktest(stockCodes, startDate, endDate, options = {}) {
    console.log('\n' + '='.repeat(70));
    console.log(`🚀 批量回测: ${stockCodes.length}只股票`);
    console.log('='.repeat(70));

    const results = [];

    for (let i = 0; i < stockCodes.length; i++) {
      const stockCode = stockCodes[i];

      console.log(`\n[${i + 1}/${stockCodes.length}] 回测 ${stockCode}...`);

      try {
        const result = await this.runBacktest(stockCode, startDate, endDate, options);
        results.push({
          success: true,
          stockCode: stockCode,
          data: result
        });

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({
          success: false,
          stockCode: stockCode,
          error: error.message
        });
        console.log(`❌ 回测失败: ${error.message}`);
      }
    }

    // 打印汇总
    console.log('\n' + '='.repeat(70));
    console.log('📊 批量回测汇总');
    console.log('='.repeat(70));

    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    console.log(`\n总计: ${results.length}只股票`);
    console.log(`成功: ${successResults.length}只`);
    console.log(`失败: ${failedResults.length}只`);

    if (successResults.length > 0) {
      const avgReturn = successResults.reduce((sum, r) =>
        sum + r.data.performance.return.totalReturn, 0
      ) / successResults.length;

      const avgWinRate = successResults.reduce((sum, r) =>
        sum + r.data.performance.trade.winRate, 0
      ) / successResults.length;

      const avgSharpe = successResults.reduce((sum, r) =>
        sum + r.data.performance.risk.sharpeRatio, 0
      ) / successResults.length;

      console.log(`\n平均表现:`);
      console.log(`  平均收益率: ${(avgReturn * 100).toFixed(2)}%`);
      console.log(`  平均胜率:   ${(avgWinRate * 100).toFixed(2)}%`);
      console.log(`  平均夏普:   ${avgSharpe.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(70));

    return results;
  }

  /**
   * 获取回测结果
   */
  async getBacktestResult(backtestId) {
    const query = `
      SELECT * FROM backtest_results
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [backtestId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * 获取回测交易记录
   */
  async getBacktestTrades(backtestId) {
    const query = `
      SELECT * FROM backtest_trades
      WHERE backtest_id = $1
      ORDER BY trade_date ASC
    `;

    const result = await this.pool.query(query, [backtestId]);
    return result.rows;
  }
}

module.exports = BacktestEngine;
