/**
 * Trade Simulator
 * 交易模拟器
 *
 * 功能:
 * 1. 模拟买入卖出操作
 * 2. 计算手续费和滑点
 * 3. 跟踪持仓和资金
 * 4. 记录交易历史
 */

class TradeSimulator {
  constructor(options = {}) {
    this.initialCapital = options.initialCapital || 1000000;
    this.cash = this.initialCapital;
    this.position = 0;
    this.avgCost = 0;
    this.trades = [];
    this.tradeCounter = 0;

    // 交易成本参数
    this.commissionRate = options.commissionRate || 0.0003; // 手续费率 0.03%
    this.slippageRate = options.slippageRate || 0.001;     // 滑点率 0.1%

    // 风控参数
    this.maxPosition = options.maxPosition || 0.3;         // 最大仓位 30%
    this.stopLoss = options.stopLoss || -0.08;             // 止损 -8%
    this.takeProfit = options.takeProfit || 0.15;          // 止盈 +15%

    console.log(`💰 初始化交易模拟器`);
    console.log(`   初始资金: ¥${this.initialCapital.toLocaleString()}`);
    console.log(`   手续费率: ${(this.commissionRate * 100).toFixed(3)}%`);
    console.log(`   滑点率: ${(this.slippageRate * 100).toFixed(2)}%`);
    console.log(`   最大仓位: ${(this.maxPosition * 100).toFixed(0)}%`);
  }

  /**
   * 执行买入
   * @param {string} stockCode - 股票代码
   * @param {number} price - 价格
   * @param {number} positionRatio - 仓位比例 (0-1)
   * @param {string} date - 交易日期
   * @param {string} reason - 买入原因
   */
  buy(stockCode, price, positionRatio, date, reason = 'MANUAL') {
    // 计算目标仓位金额
    const totalEquity = this.getTotalEquity(price);
    const targetAmount = totalEquity * positionRatio;
    const maxAmount = totalEquity * this.maxPosition;
    const actualAmount = Math.min(targetAmount, maxAmount, this.cash);

    if (actualAmount <= 0) {
      console.log(`⚠️  ${date}: 资金不足，无法买入`);
      return null;
    }

    // 计算滑点后的实际买入价格
    const actualPrice = price * (1 + this.slippageRate);
    const quantity = Math.floor(actualAmount / actualPrice / 100) * 100; // 整手买入

    if (quantity < 100) {
      console.log(`⚠️  ${date}: 金额不足一手，无法买入`);
      return null;
    }

    // 计算交易金额和手续费
    const tradeAmount = quantity * actualPrice;
    const commission = tradeAmount * this.commissionRate;
    const totalCost = tradeAmount + commission;

    // 更新持仓和现金
    const oldPosition = this.position;
    const oldAvgCost = this.avgCost;

    this.position += quantity;
    this.avgCost = ((oldPosition * oldAvgCost) + totalCost) / this.position;
    this.cash -= totalCost;

    // 记录交易
    const trade = {
      tradeId: ++this.tradeCounter,
      stockCode: stockCode,
      tradeType: 'BUY',
      tradeDate: date,
      price: actualPrice,
      quantity: quantity,
      amount: tradeAmount,
      commission: commission,
      slippage: (actualPrice - price) * quantity,
      reason: reason,
      decisionType: reason,
      cashAfter: this.cash,
      positionAfter: this.position,
      avgCostAfter: this.avgCost
    };

    this.trades.push(trade);

    console.log(`📈 ${date}: 买入 ${stockCode}`);
    console.log(`   价格: ¥${actualPrice.toFixed(2)} (滑点: +${((this.slippageRate * 100).toFixed(2))}%)`);
    console.log(`   数量: ${quantity}股`);
    console.log(`   金额: ¥${tradeAmount.toFixed(2)} (手续费: ¥${commission.toFixed(2)})`);
    console.log(`   持仓: ${this.position}股 (成本: ¥${this.avgCost.toFixed(2)})`);
    console.log(`   现金: ¥${this.cash.toFixed(2)}`);

    return trade;
  }

  /**
   * 执行卖出
   * @param {string} stockCode - 股票代码
   * @param {number} price - 价格
   * @param {number} quantity - 卖出数量（null表示全部卖出）
   * @param {string} date - 交易日期
   * @param {string} reason - 卖出原因
   */
  sell(stockCode, price, quantity = null, date, reason = 'MANUAL') {
    if (this.position <= 0) {
      console.log(`⚠️  ${date}: 无持仓，无法卖出`);
      return null;
    }

    // 默认卖出全部持仓
    const sellQuantity = quantity || this.position;

    if (sellQuantity > this.position) {
      console.log(`⚠️  ${date}: 持仓不足，无法卖出`);
      return null;
    }

    // 计算滑点后的实际卖出价格
    const actualPrice = price * (1 - this.slippageRate);

    // 计算交易金额和手续费
    const tradeAmount = sellQuantity * actualPrice;
    const commission = tradeAmount * this.commissionRate;
    const netAmount = tradeAmount - commission;

    // 计算盈亏
    const cost = this.avgCost * sellQuantity;
    const profit = netAmount - cost;
    const profitPercent = (profit / cost);

    // 更新持仓和现金
    this.position -= sellQuantity;
    this.cash += netAmount;

    // 如果全部卖出，重置平均成本
    if (this.position === 0) {
      this.avgCost = 0;
    }

    // 记录交易
    const trade = {
      tradeId: ++this.tradeCounter,
      stockCode: stockCode,
      tradeType: 'SELL',
      tradeDate: date,
      price: actualPrice,
      quantity: sellQuantity,
      amount: tradeAmount,
      commission: commission,
      slippage: (price - actualPrice) * sellQuantity,
      reason: reason,
      decisionType: reason,
      profit: profit,
      profitPercent: profitPercent,
      cashAfter: this.cash,
      positionAfter: this.position,
      avgCostAfter: this.avgCost
    };

    this.trades.push(trade);

    const profitEmoji = profit >= 0 ? '🟢' : '🔴';
    console.log(`${profitEmoji} ${date}: 卖出 ${stockCode}`);
    console.log(`   价格: ¥${actualPrice.toFixed(2)} (滑点: -${((this.slippageRate * 100).toFixed(2))}%)`);
    console.log(`   数量: ${sellQuantity}股`);
    console.log(`   金额: ¥${tradeAmount.toFixed(2)} (手续费: ¥${commission.toFixed(2)})`);
    console.log(`   盈亏: ¥${profit.toFixed(2)} (${(profitPercent * 100).toFixed(2)}%)`);
    console.log(`   持仓: ${this.position}股`);
    console.log(`   现金: ¥${this.cash.toFixed(2)}`);

    return trade;
  }

  /**
   * 根据决策执行交易
   */
  executeDecision(decision, price, date) {
    const { stockCode, decision: decisionType, recommendation } = decision;

    // BUY 决策
    if (decisionType === 'BUY') {
      let positionRatio = 0.5; // 默认50%仓位

      // 根据决策级别调整仓位
      if (recommendation && recommendation.positionSize !== undefined) {
        positionRatio = Math.abs(recommendation.positionSize) / 100;
      } else if (decision.decisionLevel === 'STRONG') {
        positionRatio = 0.7;
      } else if (decision.decisionLevel === 'MODERATE') {
        positionRatio = 0.5;
      } else if (decision.decisionLevel === 'LIGHT') {
        positionRatio = 0.3;
      }

      return this.buy(stockCode, price, positionRatio, date, decisionType + '_' + decision.decisionLevel);
    }

    // SELL 决策
    if (decisionType === 'SELL') {
      let sellRatio = 1.0; // 默认全部卖出

      // 根据决策级别调整卖出比例
      if (decision.decisionLevel === 'RISK_CONTROL') {
        sellRatio = 1.0; // 风控，全部清仓
      } else if (decision.decisionLevel === 'STRONG') {
        sellRatio = 1.0;
      } else if (decision.decisionLevel === 'MODERATE') {
        sellRatio = 0.7;
      } else {
        sellRatio = 0.5;
      }

      const quantity = Math.floor(this.position * sellRatio);
      return this.sell(stockCode, price, quantity, date, decisionType + '_' + decision.decisionLevel);
    }

    // HOLD 决策 - 检查止盈止损
    if (decisionType === 'HOLD' && this.position > 0) {
      const positionReturn = this.getPositionReturn(price);

      // 止损检查
      if (positionReturn <= this.stopLoss) {
        console.log(`🛑 ${date}: 触发止损 (${(positionReturn * 100).toFixed(2)}% <= ${(this.stopLoss * 100).toFixed(2)}%)`);
        return this.sell(stockCode, price, null, date, 'STOP_LOSS');
      }

      // 止盈检查
      if (positionReturn >= this.takeProfit) {
        console.log(`🎯 ${date}: 触发止盈 (${(positionReturn * 100).toFixed(2)}% >= ${(this.takeProfit * 100).toFixed(2)}%)`);
        return this.sell(stockCode, price, null, date, 'TAKE_PROFIT');
      }
    }

    return null;
  }

  /**
   * 获取当前市值
   */
  getMarketValue(price) {
    return this.position * price;
  }

  /**
   * 获取总资产
   */
  getTotalEquity(price) {
    return this.cash + this.getMarketValue(price);
  }

  /**
   * 获取持仓盈亏
   */
  getPositionProfit(price) {
    if (this.position === 0) return 0;
    return (price - this.avgCost) * this.position;
  }

  /**
   * 获取持仓收益率
   */
  getPositionReturn(price) {
    if (this.avgCost === 0) return 0;
    return (price - this.avgCost) / this.avgCost;
  }

  /**
   * 获取当前仓位比例
   */
  getPositionRatio(price) {
    const totalEquity = this.getTotalEquity(price);
    if (totalEquity === 0) return 0;
    return this.getMarketValue(price) / totalEquity;
  }

  /**
   * 重置模拟器
   */
  reset() {
    this.cash = this.initialCapital;
    this.position = 0;
    this.avgCost = 0;
    this.trades = [];
    this.tradeCounter = 0;
  }

  /**
   * 获取交易汇总
   */
  getTradeSummary() {
    const buyTrades = this.trades.filter(t => t.tradeType === 'BUY');
    const sellTrades = this.trades.filter(t => t.tradeType === 'SELL');

    const profitTrades = sellTrades.filter(t => t.profit > 0);
    const lossTrades = sellTrades.filter(t => t.profit < 0);

    const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = profitTrades.length > 0
      ? profitTrades.reduce((sum, t) => sum + t.profit, 0) / profitTrades.length
      : 0;
    const avgLoss = lossTrades.length > 0
      ? lossTrades.reduce((sum, t) => sum + t.profit, 0) / lossTrades.length
      : 0;

    return {
      totalTrades: this.trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      profitTrades: profitTrades.length,
      lossTrades: lossTrades.length,
      winRate: sellTrades.length > 0 ? profitTrades.length / sellTrades.length : 0,
      totalProfit: totalProfit,
      avgProfit: avgProfit,
      avgLoss: avgLoss,
      profitLossRatio: avgLoss !== 0 ? Math.abs(avgProfit / avgLoss) : 0,
      largestWin: profitTrades.length > 0 ? Math.max(...profitTrades.map(t => t.profit)) : 0,
      largestLoss: lossTrades.length > 0 ? Math.min(...lossTrades.map(t => t.profit)) : 0
    };
  }

  /**
   * 导出交易记录
   */
  exportTrades() {
    return {
      trades: this.trades,
      summary: this.getTradeSummary()
    };
  }
}

module.exports = TradeSimulator;
