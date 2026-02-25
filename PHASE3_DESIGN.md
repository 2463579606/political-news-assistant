# Phase 3: 回测系统设计文档

## 1. 概述

### 1.1 目标
构建完整的回测系统，验证决策引擎的准确性和盈利能力，为参数优化提供数据支持。

### 1.2 核心功能
1. **历史决策回测** - 基于历史数据模拟执行决策
2. **绩效指标计算** - 胜率、盈亏比、最大回撤、夏普比率等
3. **回测报告生成** - 详细的收益曲线和持仓分析
4. **参数优化** - 自动寻找最优决策参数
5. **策略对比** - 对比不同策略的表现

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      回测系统架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  决策引擎     │ ───> │  回测引擎     │                    │
│  │  Decision    │      │  Backtest    │                    │
│  │  Engine      │      │  Engine      │                    │
│  └──────────────┘      └──────┬───────┘                    │
│                                │                             │
│                         ┌──────▼───────┐                    │
│                         │  历史数据     │                    │
│                         │  Historical  │                    │
│                         │  Data Loader │                    │
│                         └──────┬───────┘                    │
│                                │                             │
│  ┌──────────────┐      ┌──────▼───────┐                    │
│  │  绩效分析     │ <─── │  交易模拟     │                    │
│  │  Performance │      │  Simulator   │                    │
│  │  Analyzer    │      └──────────────┘                    │
│  └──────────────┘                                            │
│         │                                                     │
│  ┌──────▼───────┐      ┌──────────────┐                    │
│  │  报告生成     │ ───> │  参数优化     │                    │
│  │  Report      │      │  Optimizer   │                    │
│  │  Generator   │      └──────────────┘                    │
│  └──────────────┘                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块设计

### 3.1 回测引擎 (BacktestEngine)

**文件**: `services/backtest/backtest-engine.js`

**功能**:
```javascript
class BacktestEngine {
  // 1. 配置回测参数
  configure(options) {
    // - startDate: 回测开始日期
    // - endDate: 回测结束日期
    // - initialCapital: 初始资金
    // - commission: 手续费率
    // - slippage: 滑点比例
  }

  // 2. 运行回测
  async runBacktest(stockCode, startDate, endDate) {
    // 步骤:
    // 1. 加载历史数据（K线、资金流向、新闻）
    // 2. 逐日模拟
    //    - 生成当日决策
    //    - 执行交易操作
    //    - 更新持仓和资金
    //    - 记录交易记录
    // 3. 返回回测结果
  }

  // 3. 批量回测
  async batchBacktest(stockCodes, startDate, endDate) {
    // 对多只股票进行回测
  }

  // 4. 模拟单笔交易
  simulateTrade(decision, currentPrice) {
    // 根据决策和当前价格模拟交易
    // - BUY: 买入（按仓位比例）
    // - SELL: 卖出（全部或部分）
    // - HOLD: 持有不变
  }
}
```

**数据结构**:
```javascript
// 回测配置
{
  startDate: '2024-01-01',
  endDate: '2025-12-31',
  initialCapital: 1000000,    // 初始资金 100万
  commission: 0.0003,          // 手续费率 0.03%
  slippage: 0.001,            // 滑点 0.1%
  maxPosition: 0.3,           // 最大单只仓位 30%
  stopLoss: -0.08,            // 止损 -8%
  takeProfit: 0.15            // 止盈 +15%
}

// 回测结果
{
  stockCode: '000001.SZ',
  startDate: '2024-01-01',
  endDate: '2025-12-31',
  trades: [],                  // 交易记录
  dailyReturns: [],            // 每日收益率
  equityCurve: [],             // 资金曲线
  finalCapital: 1150000,       // 最终资金
  totalReturn: 0.15,           // 总收益率 15%
  annualReturn: 0.072,         // 年化收益率 7.2%
  metrics: {
    winRate: 0.55,             // 胜率 55%
    profitLossRatio: 1.8,      // 盈亏比 1.8
    maxDrawdown: -0.12,        // 最大回撤 -12%
    sharpeRatio: 0.85,         // 夏普比率 0.85
    winTrades: 22,             // 盈利次数
    lossTrades: 18,            // 亏损次数
    avgWin: 0.032,             // 平均盈利 3.2%
    avgLoss: -0.018            // 平均亏损 -1.8%
  }
}
```

---

### 3.2 历史数据加载器 (HistoricalDataLoader)

**文件**: `services/backtest/historical-data-loader.js`

**功能**:
```javascript
class HistoricalDataLoader {
  // 加载指定日期范围的历史数据
  async loadHistoricalData(stockCode, startDate, endDate) {
    return {
      marketData: [],      // K线数据
      fundFlow: [],        // 资金流向
      newsEvents: [],      // 新闻事件
      decisions: []        // 历史决策（如果有）
    };
  }

  // 按日期分组数据
  groupByDate(data) {
    // 返回 { '2024-01-01': { market: {...}, fund: {...}, news: [...] } }
  }

  // 获取交易日历
  async getTradingDays(startDate, endDate) {
    // 返回交易日列表（排除周末和节假日）
  }
}
```

---

### 3.3 交易模拟器 (TradeSimulator)

**文件**: `services/backtest/trade-simulator.js`

**功能**:
```javascript
class TradeSimulator {
  constructor(options) {
    this.cash = options.initialCapital;    // 可用现金
    this.position = 0;                      // 持仓数量
    this.avgCost = 0;                       // 平均成本
    this.trades = [];                       // 交易记录
  }

  // 执行买入
  buy(stockCode, price, quantity, date, reason) {
    // 计算交易金额（含手续费和滑点）
    // 检查资金是否充足
    // 更新持仓和现金
    // 记录交易
  }

  // 执行卖出
  sell(stockCode, price, quantity, date, reason) {
    // 检查持仓是否充足
    // 计算交易金额（扣除手续费和滑点）
    // 更新持仓和现金
    // 记录交易和盈亏
  }

  // 获取当前市值
  getMarketValue(currentPrice) {
    return this.position * currentPrice;
  }

  // 获取总资产
  getTotalEquity(currentPrice) {
    return this.cash + this.getMarketValue(currentPrice);
  }

  // 获取持仓盈亏
  getPositionProfit(currentPrice) {
    return (currentPrice - this.avgCost) * this.position;
  }

  // 获取持仓收益率
  getPositionReturn(currentPrice) {
    if (this.avgCost === 0) return 0;
    return (currentPrice - this.avgCost) / this.avgCost;
  }
}
```

**交易记录数据结构**:
```javascript
{
  tradeId: 1,
  stockCode: '000001.SZ',
  tradeType: 'BUY' | 'SELL',
  tradeDate: '2024-01-15',
  price: 15.50,
  quantity: 1000,
  amount: 15500,
  commission: 4.65,              // 手续费
  slippage: 15.50,               // 滑点成本
  reason: 'BUY_MODERATE',        // 决策原因
  decisionId: null,              // 关联决策ID
  profit: null,                  // 卖出时的盈亏
  profitPercent: null            // 卖出时的盈亏比例
}
```

---

### 3.4 绩效分析器 (PerformanceAnalyzer)

**文件**: `services/backtest/performance-analyzer.js`

**功能**:
```javascript
class PerformanceAnalyzer {
  // 计算收益指标
  calculateReturnMetrics(backtestResult) {
    return {
      totalReturn: finalCapital / initialCapital - 1,
      annualReturn: totalReturn / (holdingDays / 365),
      monthlyReturns: [],
      dailyReturns: []
    };
  }

  // 计算风险指标
  calculateRiskMetrics(backtestResult) {
    return {
      maxDrawdown: this.calculateMaxDrawdown(equityCurve),
      volatility: this.calculateVolatility(dailyReturns),
      sharpeRatio: this.calculateSharpe(annualReturn, volatility),
      sortinoRatio: this.calculateSortino(dailyReturns),
      calmarRatio: annualReturn / Math.abs(maxDrawdown)
    };
  }

  // 计算交易指标
  calculateTradeMetrics(trades) {
    return {
      totalTrades: trades.length,
      winTrades: wins,
      lossTrades: losses,
      winRate: wins / (wins + losses),
      avgWin: sumWin / wins,
      avgLoss: sumLoss / losses,
      profitLossRatio: Math.abs(avgWin / avgLoss),
      largestWin: max(winProfits),
      largestLoss: min(lossProfits),
      avgHoldingPeriod: avg(days)
    };
  }

  // 计算最大回撤
  calculateMaxDrawdown(equityCurve) {
    let maxEquity = equityCurve[0];
    let maxDrawdown = 0;

    for (let i = 1; i < equityCurve.length; i++) {
      if (equityCurve[i] > maxEquity) {
        maxEquity = equityCurve[i];
      }
      const drawdown = (equityCurve[i] - maxEquity) / maxEquity;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  // 计算夏普比率
  calculateSharpe(annualReturn, volatility, riskFreeRate = 0.03) {
    return (annualReturn - riskFreeRate) / volatility;
  }
}
```

---

### 3.5 回测报告生成器 (BacktestReportGenerator)

**文件**: `services/backtest/backtest-report-generator.js`

**功能**:
```javascript
class BacktestReportGenerator {
  // 生成完整报告
  generateReport(backtestResult) {
    return {
      summary: this.generateSummary(backtestResult),
      metrics: this.generateMetrics(backtestResult),
      trades: this.generateTradeAnalysis(backtestResult),
      equity: this.generateEquityAnalysis(backtestResult),
      drawdown: this.generateDrawdownAnalysis(backtestResult),
      monthly: this.generateMonthlyAnalysis(backtestResult),
      recommendations: this.generateRecommendations(backtestResult)
    };
  }

  // 生成摘要
  generateSummary(result) {
    return {
      stockCode: result.stockCode,
      backtestPeriod: `${result.startDate} ~ ${result.endDate}`,
      totalReturn: `${(result.totalReturn * 100).toFixed(2)}%`,
      annualReturn: `${(result.annualReturn * 100).toFixed(2)}%`,
      maxDrawdown: `${(result.metrics.maxDrawdown * 100).toFixed(2)}%`,
      sharpeRatio: result.metrics.sharpeRatio.toFixed(2),
      winRate: `${(result.metrics.winRate * 100).toFixed(2)}%`,
      totalTrades: result.metrics.winTrades + result.metrics.lossTrades
    };
  }

  // 生成交易分析
  generateTradeAnalysis(result) {
    // 按月份统计交易
    // 按决策类型统计（BUY/SELL/HOLD）
    // 盈亏分布
    // 持仓周期分布
  }

  // 生成资金曲线分析
  generateEquityAnalysis(result) {
    // 收益率曲线
    // 累计收益曲线
    // 滚动收益（30日、60日、90日）
  }

  // 生成回撤分析
  generateDrawdownAnalysis(result) {
    // 最大回撤点
    // 回撤持续时间
    // 回撤恢复期
  }

  // 生成优化建议
  generateRecommendations(result) {
    const recommendations = [];

    if (result.metrics.winRate < 0.5) {
      recommendations.push('胜率偏低，建议优化决策阈值');
    }

    if (result.metrics.maxDrawdown < -0.15) {
      recommendations.push('最大回撤过大，建议加强风控');
    }

    if (result.metrics.sharpeRatio < 1.0) {
      recommendations.push('夏普比率偏低，收益风险比不佳');
    }

    // ... 更多建议

    return recommendations;
  }

  // 导出为JSON
  exportToJson(report, filePath) {
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  }

  // 导出为HTML
  exportToHtml(report, filePath) {
    // 生成可视化HTML报告
  }
}
```

---

### 3.6 参数优化器 (ParameterOptimizer)

**文件**: `services/backtest/parameter-optimizer.js`

**功能**:
```javascript
class ParameterOptimizer {
  // 网格搜索优化
  async gridSearch(stockCode, startDate, endDate, paramGrid) {
    // paramGrid示例:
    // {
    //   buyThreshold: [70, 75, 80, 85],
    //   sellThreshold: [30, 35, 40, 45],
    //   stopLoss: [-0.05, -0.08, -0.10],
    //   takeProfit: [0.10, 0.15, 0.20]
    // }

    const results = [];

    // 遍历所有参数组合
    for (const buyThresh of paramGrid.buyThreshold) {
      for (const sellThresh of paramGrid.sellThreshold) {
        for (const stopLoss of paramGrid.stopLoss) {
          for (const takeProfit of paramGrid.takeProfit) {
            // 运行回测
            const result = await this.runBacktestWithParams(
              stockCode, startDate, endDate,
              { buyThreshold: buyThresh, sellThreshold: sellThresh, stopLoss, takeProfit }
            );
            results.push(result);
          }
        }
      }
    }

    // 按某指标排序（如夏普比率）
    return results.sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio);
  }

  // 遗传算法优化
  async geneticOptimize(stockCode, startDate, endDate, options) {
    // 使用遗传算法搜索最优参数
  }

  // 贝叶斯优化
  async bayesianOptimize(stockCode, startDate, endDate, options) {
    // 使用贝叶斯优化搜索最优参数
  }
}
```

---

## 4. 数据库设计

### 4.1 回测结果表 (backtest_results)

```sql
CREATE TABLE backtest_results (
  id SERIAL PRIMARY KEY,
  stock_code VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL,
  final_capital DECIMAL(15,2) NOT NULL,
  total_return DECIMAL(10,4) NOT NULL,
  annual_return DECIMAL(10,4) NOT NULL,
  max_drawdown DECIMAL(10,4) NOT NULL,
  sharpe_ratio DECIMAL(10,4),
  win_rate DECIMAL(10,4),
  profit_loss_ratio DECIMAL(10,4),
  total_trades INTEGER,
  win_trades INTEGER,
  loss_trades INTEGER,
  parameters JSONB,
  metrics JSONB,
  equity_curve JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_code (stock_code),
  INDEX idx_date_range (start_date, end_date)
);
```

### 4.2 交易记录表 (backtest_trades)

```sql
CREATE TABLE backtest_trades (
  id SERIAL PRIMARY KEY,
  backtest_id INTEGER REFERENCES backtest_results(id),
  stock_code VARCHAR(20) NOT NULL,
  trade_type VARCHAR(10) NOT NULL, -- BUY/SELL
  trade_date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  slippage DECIMAL(10,2) NOT NULL,
  reason VARCHAR(50),
  decision_id INTEGER,
  profit DECIMAL(15,2),
  profit_percent DECIMAL(10,4),
  INDEX idx_backtest_id (backtest_id),
  INDEX idx_trade_date (trade_date)
);
```

---

## 5. API接口设计

### 5.1 回测接口

#### POST /api/v2/backtest/run
运行回测

```json
// Request
{
  "stockCode": "000001.SZ",
  "startDate": "2024-01-01",
  "endDate": "2025-12-31",
  "options": {
    "initialCapital": 1000000,
    "commission": 0.0003,
    "slippage": 0.001,
    "maxPosition": 0.3,
    "stopLoss": -0.08,
    "takeProfit": 0.15
  }
}

// Response
{
  "success": true,
  "data": {
    "backtestId": 1,
    "stockCode": "000001.SZ",
    "result": { ... }
  }
}
```

#### POST /api/v2/backtest/batch-run
批量回测

```json
// Request
{
  "stockCodes": ["000001.SZ", "600000.SH"],
  "startDate": "2024-01-01",
  "endDate": "2025-12-31",
  "options": { ... }
}

// Response
{
  "success": true,
  "data": {
    "total": 2,
    "results": [ ... ]
  }
}
```

#### GET /api/v2/backtest/results/:backtestId
获取回测结果

#### GET /api/v2/backtest/results/:backtestId/report
获取回测报告

#### POST /api/v2/backtest/optimize
参数优化

```json
// Request
{
  "stockCode": "000001.SZ",
  "startDate": "2024-01-01",
  "endDate": "2025-12-31",
  "paramGrid": {
    "buyThreshold": [70, 75, 80],
    "sellThreshold": [30, 35, 40]
  },
  "optimizeTarget": "sharpeRatio"
}

// Response
{
  "success": true,
  "data": {
    "bestParams": { ... },
    "allResults": [ ... ]
  }
}
```

---

## 6. 实现计划

### 阶段1: 基础回测引擎 (1-2天)
- ✅ HistoricalDataLoader - 历史数据加载
- ✅ TradeSimulator - 交易模拟器
- ✅ BacktestEngine - 核心回测引擎
- ✅ PerformanceAnalyzer - 绩效分析

### 阶段2: 报告和优化 (1天)
- ✅ BacktestReportGenerator - 报告生成
- ✅ ParameterOptimizer - 参数优化
- ✅ 数据库表创建

### 阶段3: API和测试 (1天)
- ✅ RESTful API接口
- ✅ 单元测试
- ✅ 集成测试
- ✅ 回测验证

---

## 7. 成功标准

### 7.1 功能完整性
- ✅ 能够完整运行历史回测
- ✅ 能够计算所有关键绩效指标
- ✅ 能够生成详细的回测报告
- ✅ 能够进行参数优化

### 7.2 性能要求
- 单只股票1年回测时间 < 5秒
- 100只股票批量回测时间 < 2分钟

### 7.3 准确性要求
- 交易模拟准确（考虑手续费、滑点）
- 绩效计算准确（符合行业标准）
- 数据无丢失、无重复

---

## 8. 风险和挑战

### 8.1 数据完整性
- 风险: 历史数据缺失或错误
- 应对: 数据验证和填充

### 8.2 回测偏差
- 风险: 过度拟合、未来函数
- 应对: 样本外验证、严格的时间控制

### 8.3 性能优化
- 风险: 大规模回测耗时长
- 应对: 并行处理、缓存优化

---

**文档版本**: v1.0
**创建日期**: 2026-02-25
**作者**: Claude Code
