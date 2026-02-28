/**
 * Performance Analyzer
 * 绩效分析器
 *
 * 功能:
 * 1. 计算收益指标
 * 2. 计算风险指标
 * 3. 计算交易指标
 * 4. 生成绩效报告
 */

class PerformanceAnalyzer {
  /**
   * 分析回测结果
   * @param {Object} backtestResult - 回测结果
   */
  analyze(backtestResult) {
    const { trades, equityCurve, initialCapital, finalCapital, dailyReturns } = backtestResult;

    return {
      return: this.calculateReturnMetrics(backtestResult),
      risk: this.calculateRiskMetrics(backtestResult),
      trade: this.calculateTradeMetrics(trades),
      equity: this.calculateEquityMetrics(equityCurve),
      monthly: this.calculateMonthlyReturns(backtestResult),
      rolling: this.calculateRollingReturns(dailyReturns)
    };
  }

  /**
   * 计算收益指标
   */
  calculateReturnMetrics(result) {
    const { initialCapital, finalCapital, startDate, endDate } = result;

    // 计算持有天数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const holdingDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    const holdingYears = holdingDays / 365;

    // 总收益率
    const totalReturn = (finalCapital - initialCapital) / initialCapital;

    // 年化收益率
    const annualReturn = Math.pow(1 + totalReturn, 1 / holdingYears) - 1;

    return {
      totalReturn: totalReturn,
      totalReturnPercent: (totalReturn * 100).toFixed(2) + '%',
      annualReturn: annualReturn,
      annualReturnPercent: (annualReturn * 100).toFixed(2) + '%',
      holdingDays: holdingDays,
      holdingYears: holdingYears.toFixed(2),
      initialCapital: initialCapital,
      finalCapital: finalCapital,
      profit: finalCapital - initialCapital,
      profitPercent: ((finalCapital - initialCapital) / initialCapital * 100).toFixed(2) + '%'
    };
  }

  /**
   * 计算风险指标
   */
  calculateRiskMetrics(result) {
    const { equityCurve, dailyReturns } = result;

    // 最大回撤
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);

    // 波动率（年化）
    const volatility = this.calculateVolatility(dailyReturns);

    // 夏普比率
    const sharpeRatio = this.calculateSharpeRatio(result.annualReturn || 0, volatility);

    // 索提诺比率
    const sortinoRatio = this.calculateSortinoRatio(dailyReturns);

    // 卡玛比率
    const calmarRatio = this.calculateCalmarRatio(result.annualReturn || 0, maxDrawdown);

    // 提取最大回撤值
    const maxDrawdownValue = typeof maxDrawdown === 'object' ? maxDrawdown.value : maxDrawdown;

    return {
      maxDrawdown: maxDrawdown,
      maxDrawdownPercent: (Math.abs(maxDrawdownValue) * 100).toFixed(2) + '%',
      volatility: volatility,
      volatilityPercent: (volatility * 100).toFixed(2) + '%',
      sharpeRatio: sharpeRatio,
      sortinoRatio: sortinoRatio,
      calmarRatio: calmarRatio
    };
  }

  /**
   * 计算交易指标
   */
  calculateTradeMetrics(trades) {
    if (!trades || trades.length === 0) {
      return this.getEmptyTradeMetrics();
    }

    const buyTrades = trades.filter(t => t.tradeType === 'BUY');
    const sellTrades = trades.filter(t => t.tradeType === 'SELL');

    // 有盈亏数据的卖出交易
    const profitTrades = sellTrades.filter(t => t.profit !== null && t.profit !== undefined);
    const wins = profitTrades.filter(t => t.profit > 0);
    const losses = profitTrades.filter(t => t.profit < 0);

    const winCount = wins.length;
    const lossCount = losses.length;
    const totalCount = winCount + lossCount;

    // 胜率
    const winRate = totalCount > 0 ? winCount / totalCount : 0;

    // 平均盈亏
    const avgWin = winCount > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / winCount : 0;
    const avgLoss = lossCount > 0 ? losses.reduce((sum, t) => sum + t.profit, 0) / lossCount : 0;

    // 盈亏比
    const profitLossRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    // 最大盈利/亏损
    const largestWin = winCount > 0 ? Math.max(...wins.map(t => t.profit)) : 0;
    const largestLoss = lossCount > 0 ? Math.min(...losses.map(t => t.profit)) : 0;

    // 平均持仓天数
    const completedTrades = profitTrades;
    const holdingPeriods = completedTrades.map(t => {
      const buyTrade = trades.find(bt =>
        bt.tradeType === 'BUY' &&
        bt.stockCode === t.stockCode &&
        bt.tradeDate < t.tradeDate
      );
      if (buyTrade) {
        const buyDate = new Date(buyTrade.tradeDate);
        const sellDate = new Date(t.tradeDate);
        return Math.floor((sellDate - buyDate) / (1000 * 60 * 60 * 24));
      }
      return 0;
    });
    const avgHoldingPeriod = holdingPeriods.length > 0
      ? holdingPeriods.reduce((sum, d) => sum + d, 0) / holdingPeriods.length
      : 0;

    // 总盈亏
    const totalProfit = profitTrades.reduce((sum, t) => sum + t.profit, 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

    // 盈利因子
    const profitFactor = grossLoss !== 0 ? grossProfit / grossLoss : 0;

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      completedTrades: totalCount,
      winTrades: winCount,
      lossTrades: lossCount,
      winRate: winRate,
      winRatePercent: (winRate * 100).toFixed(2) + '%',
      avgWin: avgWin,
      avgLoss: avgLoss,
      avgWinPercent: ((avgWin / 10000) * 100).toFixed(2) + '%',
      avgLossPercent: ((avgLoss / 10000) * 100).toFixed(2) + '%',
      profitLossRatio: profitLossRatio,
      largestWin: largestWin,
      largestLoss: largestLoss,
      avgHoldingPeriod: avgHoldingPeriod,
      totalProfit: totalProfit,
      grossProfit: grossProfit,
      grossLoss: grossLoss,
      profitFactor: profitFactor
    };
  }

  /**
   * 计算资金曲线指标
   */
  calculateEquityMetrics(equityCurve) {
    if (!equityCurve || equityCurve.length === 0) {
      return {
        high: 0,
        low: 0,
        avg: 0,
        growth: 0
      };
    }

    const values = equityCurve.map(e => e.equity);

    return {
      high: Math.max(...values),
      low: Math.min(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      growth: ((values[values.length - 1] - values[0]) / values[0]),
      points: equityCurve.length
    };
  }

  /**
   * 计算月度收益
   */
  calculateMonthlyReturns(result) {
    const { equityCurve } = result;

    if (!equityCurve || equityCurve.length === 0) {
      return [];
    }

    const monthlyMap = new Map();

    equityCurve.forEach(point => {
      const date = new Date(point.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          startEquity: point.equity,
          endEquity: point.equity,
          days: 1
        });
      } else {
        const data = monthlyMap.get(monthKey);
        data.endEquity = point.equity;
        data.days++;
      }
    });

    const monthlyReturns = [];
    monthlyMap.forEach((data, monthKey) => {
      const monthlyReturn = (data.endEquity - data.startEquity) / data.startEquity;
      monthlyReturns.push({
        month: monthKey,
        return: monthlyReturn,
        returnPercent: (monthlyReturn * 100).toFixed(2) + '%',
        startEquity: data.startEquity,
        endEquity: data.endEquity,
        days: data.days
      });
    });

    return monthlyReturns;
  }

  /**
   * 计算滚动收益
   */
  calculateRollingReturns(dailyReturns) {
    if (!dailyReturns || dailyReturns.length < 20) {
      return {
        avg5Days: 0,
        avg10Days: 0,
        avg20Days: 0,
        avg60Days: 0
      };
    }

    return {
      avg5Days: this.calculateAverageReturn(dailyReturns, 5),
      avg10Days: this.calculateAverageReturn(dailyReturns, 10),
      avg20Days: this.calculateAverageReturn(dailyReturns, 20),
      avg60Days: this.calculateAverageReturn(dailyReturns, 60)
    };
  }

  /**
   * 计算最大回撤
   */
  calculateMaxDrawdown(equityCurve) {
    if (!equityCurve || equityCurve.length === 0) {
      return 0;
    }

    let maxEquity = equityCurve[0].equity;
    let maxDrawdown = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdownDuration = 0;

    for (let i = 1; i < equityCurve.length; i++) {
      const currentEquity = equityCurve[i].equity;

      // 更新最高点
      if (currentEquity > maxEquity) {
        maxEquity = currentEquity;
        currentDrawdownDuration = 0;
      } else {
        currentDrawdownDuration++;
        if (currentDrawdownDuration > maxDrawdownDuration) {
          maxDrawdownDuration = currentDrawdownDuration;
        }
      }

      // 计算当前回撤
      const drawdown = (currentEquity - maxEquity) / maxEquity;

      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      value: maxDrawdown,
      duration: maxDrawdownDuration
    };
  }

  /**
   * 计算波动率（年化）
   */
  calculateVolatility(dailyReturns) {
    if (!dailyReturns || dailyReturns.length < 2) {
      return 0;
    }

    // 计算平均值
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;

    // 计算方差
    const variance = dailyReturns.reduce((sum, r) => {
      return sum + Math.pow(r - avgReturn, 2);
    }, 0) / dailyReturns.length;

    // 日波动率
    const dailyVolatility = Math.sqrt(variance);

    // 年化波动率（假设252个交易日）
    return dailyVolatility * Math.sqrt(252);
  }

  /**
   * 计算夏普比率
   */
  calculateSharpeRatio(annualReturn, volatility, riskFreeRate = 0.03) {
    if (volatility === 0) {
      return 0;
    }

    return (annualReturn - riskFreeRate) / volatility;
  }

  /**
   * 计算索提诺比率
   */
  calculateSortinoRatio(dailyReturns, riskFreeRate = 0.03) {
    if (!dailyReturns || dailyReturns.length < 2) {
      return 0;
    }

    // 计算年平均收益
    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const annualReturn = avgDailyReturn * 252;

    // 计算下行偏差
    const negativeReturns = dailyReturns.filter(r => r < 0);
    if (negativeReturns.length === 0) {
      return 0; // 没有下行风险
    }

    const avgNegativeReturn = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgNegativeReturn, 2), 0) /
      negativeReturns.length
    ) * Math.sqrt(252);

    if (downsideDeviation === 0) {
      return 0;
    }

    return (annualReturn - riskFreeRate) / downsideDeviation;
  }

  /**
   * 计算卡玛比率
   */
  calculateCalmarRatio(annualReturn, maxDrawdown) {
    const drawdownValue = typeof maxDrawdown === 'object' ? maxDrawdown.value : maxDrawdown;

    if (drawdownValue === 0) {
      return 0;
    }

    return annualReturn / Math.abs(drawdownValue);
  }

  /**
   * 计算平均收益
   */
  calculateAverageReturn(dailyReturns, days) {
    if (!dailyReturns || dailyReturns.length < days) {
      return 0;
    }

    const recentReturns = dailyReturns.slice(-days);
    const avgReturn = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;

    // 年化
    return avgReturn * 252;
  }

  /**
   * 获取空的交易指标
   */
  getEmptyTradeMetrics() {
    return {
      totalTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      completedTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      winRate: 0,
      winRatePercent: '0.00%',
      avgWin: 0,
      avgLoss: 0,
      avgWinPercent: '0.00%',
      avgLossPercent: '0.00%',
      profitLossRatio: 0,
      largestWin: 0,
      largestLoss: 0,
      avgHoldingPeriod: 0,
      totalProfit: 0,
      grossProfit: 0,
      grossLoss: 0,
      profitFactor: 0
    };
  }
}

module.exports = PerformanceAnalyzer;
