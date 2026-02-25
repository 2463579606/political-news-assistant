# Phase 2 决策引擎开发设计文档

**阶段**: Phase 2 - 决策引擎
**预计时间**: 3-4周
**开始日期**: 2026-02-25
**状态**: 🚧 开发中

---

## 📋 需求概述

### 核心目标
基于Phase 1收集的多维度数据（市场数据、资金流向、新闻事件、相似事件），构建智能投资决策引擎，为用户提供具体的买入/卖出/持有建议。

### 输入数据
```
1. 技术面分析 (30%)
   - MA, MACD, RSI, KDJ, BOLL等5个技术指标
   - 价格趋势和波动性
   - 成交量和成交额变化

2. 资金面分析 (20%)
   - 主力资金流向
   - 大单、中单、小单流向
   - 连续流入/流出模式

3. 消息面分析 (30%)
   - 新闻事件重要性
   - 情感倾向（正面/负面）
   - 相似历史事件影响

4. 板块面分析 (20%)
   - 板块热度
   - 板块资金流向
   - 板块轮动趋势
```

### 输出结果
```
决策建议:
- BUY (买入)
- SELL (卖出)
- HOLD (持有/观望)

置信度: 0-100%
预期收益率: ±百分比
风险等级: 低/中/高
理由说明: 自然语言描述
```

---

## 🏗️ 系统架构

### 模块划分

```
┌─────────────────────────────────────────────────────────┐
│                   决策引擎 (Decision Engine)              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 数据采集层   │→ │ 分析层       │→ │ 决策层       │  │
│  │ Data Layer   │  │ Analysis     │  │ Decision     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                 ↓                  ↓          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 技术数据     │  │ 评分系统     │  │ 决策逻辑     │  │
│  │ 资金数据     │  │ Scoring      │  │ Logic        │  │
│  │ 新闻数据     │  │              │  │              │  │
│  │ 向量数据     │  │ 风险评估     │  │ 风险控制     │  │
│  └──────────────┘  │ Risk Model   │  │              │  │
│                   └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 存储层 (Storage)                                  │  │
│  │ - decisions (决策记录表)                          │  │
│  │ - decision_factors (决策因子表)                  │  │
│  │ - backtest_results (回测结果表)                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. ScoringSystemService (综合评分系统)
```
功能:
- 计算技术面评分 (0-100)
- 计算资金面评分 (0-100)
- 计算消息面评分 (0-100)
- 计算板块面评分 (0-100)
- 加权计算综合评分 (0-100)

权重分配:
- 技术面: 30%
- 资金面: 20%
- 消息面: 30%
- 板块面: 20%
```

#### 2. DecisionEngine (决策引擎)
```
功能:
- 基于综合评分生成决策
- BUY规则: 评分≥70 且 风险可控
- SELL规则: 评分≤30 或 风险过高
- HOLD规则: 30<评分<70
- 置信度计算
- 理由生成
```

#### 3. RiskAssessmentService (风险评估服务)
```
功能:
- 波动率风险计算
- 最大回撤评估
- 仓位风险分析
- 集中度风险
- 综合风险等级评定

风险等级:
- LOW: 0-30分
- MEDIUM: 31-70分
- HIGH: 71-100分
```

#### 4. BacktestEngine (回测引擎)
```
功能:
- 历史决策回测
- 收益率计算
- 夏普比率计算
- 最大回撤计算
- 胜率统计
- 盈亏比分析
```

#### 5. DecisionTracker (决策追踪器)
```
功能:
- 记录每次决策
- 跟踪决策结果
- 计算实际收益率
- 决策准确率统计
- 持续学习优化
```

---

## 📊 综合评分系统设计

### 1. 技术面评分 (Technical Score - 30%)

#### 评分要素
```
1. 趋势指标 (40%)
   - MA多头排列: +20分
   - MA空头排列: -20分
   - 价格位置: 相对MA的位置 ±10分

2. 动量指标 (30%)
   - MACD金叉: +15分
   - MACD死叉: -15分
   - DIF>DEA: +5分
   - 柱状图>0: +5分

3. 超买超卖 (15%)
   - RSI<30 (超卖): +10分
   - RSI>70 (超买): -10分
   - KDJ超买超卖: ±5分

4. 波动性 (15%)
   - BOLL带宽: ±5分
   - 价格相对BOLL位置: ±10分

总分: 0-100分
```

#### 计算公式
```javascript
技术面评分 = (
  趋势得分 × 0.40 +
  动量得分 × 0.30 +
  超买超卖得分 × 0.15 +
  波动性得分 × 0.15
).toFixed(2)
```

### 2. 资金面评分 (Fund Flow Score - 20%)

#### 评分要素
```
1. 主力流向 (50%)
   - 大幅流入 (>1亿): +25分
   - 流入 (>0): +15分
   - 流出 (<0): -15分
   - 大幅流出 (<-1亿): -25分

2. 连续性 (30%)
   - 连续流入≥3天: +15分
   - 连续流入1-2天: +10分
   - 无连续模式: 0分
   - 连续流出≥3天: -15分

3. 散户情绪 (20%)
   - 散户流入: +5分
   - 散户流出: -5分

总分: 0-100分
```

#### 计算公式
```javascript
资金面评分 = (
  主力流向得分 × 0.50 +
  连续性得分 × 0.30 +
  散户情绪得分 × 0.20
).toFixed(2)
```

### 3. 消息面评分 (News Score - 30%)

#### 评分要素
```
1. 事件重要性 (40%)
   - 重大事件 (9-10分): +40分
   - 重要事件 (7-8分): +30分
   - 一般事件 (4-6分): +15分
   - 轻微事件 (1-3分): +5分

2. 情感倾向 (30%)
   - 强烈正面 (情感>0.7): +30分
   - 正面 (情感>0.3): +20分
   - 中性 (情感≈0): 0分
   - 负面 (情感<-0.3): -20分
   - 强烈负面 (情感<-0.7): -30分

3. 相似历史事件 (30%)
   - 历史正面影响: +15分
   - 历史负面影响: -15分
   - 无相似事件: 0分

总分: 0-100分
```

#### 计算公式
```javascript
消息面评分 = (
  重要性得分 × 0.40 +
  情感得分 × 0.30 +
  历史影响得分 × 0.30
).toFixed(2)
```

### 4. 板块面评分 (Sector Score - 20%)

#### 评分要素
```
1. 板块热度 (50%)
   - 热度评分: 板块热度分数 × 0.5

2. 板块资金流向 (50%)
   - 板块净流入: +25分
   - 板块净流出: -25分
   - 流向强度按比例调整

总分: 0-100分
```

#### 计算公式
```javascript
板块面评分 = (
  板块热度得分 × 0.50 +
  板块资金得分 × 0.50
).toFixed(2)
```

### 5. 综合评分 (Overall Score)

#### 加权计算
```javascript
综合评分 = (
  技术面评分 × 0.30 +
  资金面评分 × 0.20 +
  消息面评分 × 0.30 +
  板块面评分 × 0.20
).toFixed(2)
```

#### 评分等级
```
S级 (90-100): 强烈推荐买入
A级 (80-89): 推荐买入
B级 (70-79): 谨慎买入
C级 (60-69): 观望/持有
D级 (50-59): 谨慎持有
E级 (40-49): 考虑卖出
F级 (0-39): 强烈推荐卖出
```

---

## 🎯 决策逻辑设计

### 决策规则

#### 买入 (BUY)
```
触发条件:
1. 综合评分 ≥ 70
2. 技术面评分 ≥ 60
3. 资金面评分 ≥ 60 (主力流入)
4. 风险等级 ≠ HIGH
5. 消息面无重大负面

分级买入:
- 90-100分: 重仓买入 (30%仓位)
- 80-89分: 中仓买入 (20%仓位)
- 70-79分: 轻仓买入 (10%仓位)
```

#### 卖出 (SELL)
```
触发条件:
1. 综合评分 ≤ 30
2. 或 技术面评分 ≤ 20
3. 或 资金面评分 ≤ 20 (大幅流出)
4. 或 风险等级 = HIGH
5. 或 重大负面新闻

分级卖出:
- 0-20分: 清仓卖出 (100%仓位)
- 21-30分: 减仓卖出 (50%仓位)
```

#### 持有 (HOLD)
```
触发条件:
1. 30 < 综合评分 < 70
2. 且 不满足买入条件
3. 且 不满足卖出条件

操作建议:
- 60-69分: 继续持有,可适当加仓
- 40-59分: 持有观望,关注变化
- 31-39分: 谨慎持有,准备减仓
```

### 置信度计算

```javascript
置信度 = (
  评分确定性 +
  数据完整性 +
  历史准确率
) / 3

评分确定性:
- 90-100或0-10分: +30分 (极端值更确定)
- 70-89或11-30分: +20分
- 31-69分: +10分 (中间值不确定)

数据完整性:
- 四维数据完整: +30分
- 三维数据完整: +20分
- 二维数据完整: +10分
- 一维数据完整: +5分

历史准确率:
- 基于历史决策的实际准确率
- 0-40分
```

---

## ⚠️ 风险评估模型

### 风险维度

#### 1. 波动率风险 (Volatility Risk)
```javascript
// 计算历史波动率
波动率 = STD(收益率) × √252

风险评分:
- 低波动率 (<20%): 0-20分
- 中波动率 (20-40%): 21-50分
- 高波动率 (>40%): 51-100分
```

#### 2. 最大回撤风险 (Max Drawdown Risk)
```javascript
// 计算最大回撤
最大回撤 = MAX(从峰值到谷底的跌幅)

风险评分:
- 低回撤 (<10%): 0-20分
- 中回撤 (10-25%): 21-50分
- 高回撤 (>25%): 51-100分
```

#### 3. 仓位风险 (Position Risk)
```javascript
// 当前仓位风险
仓位风险 = 当前仓位 × 个股风险系数

风险评分:
- 轻仓 (<10%): 0-20分
- 中仓 (10-30%): 21-50分
- 重仓 (>30%): 51-100分
```

#### 4. 集中度风险 (Concentration Risk)
```javascript
// 板块集中度
集中度 = 单板块仓位 / 总仓位

风险评分:
- 分散 (<30%): 0-20分
- 适中 (30-50%): 21-50分
- 集中 (>50%): 51-100分
```

### 综合风险等级

```javascript
综合风险 = (
  波动率风险 × 0.30 +
  回撤风险 × 0.30 +
  仓位风险 × 0.20 +
  集中度风险 × 0.20
)

风险等级:
- LOW: 0-30分 (可接受)
- MEDIUM: 31-70分 (需关注)
- HIGH: 71-100分 (需规避)
```

---

## 📈 回测系统设计

### 回测流程

```
1. 数据准备
   - 历史K线数据
   - 历史资金流向
   - 历史新闻事件
   - 历史决策记录

2. 模拟交易
   - 按日期顺序回放
   - 应用决策规则
   - 记录买卖点
   - 计算收益率

3. 统计分析
   - 总收益率
   - 年化收益率
   - 夏普比率
   - 最大回撤
   - 胜率
   - 盈亏比
   - 平均持仓天数
```

### 回测指标

```javascript
// 收益率指标
总收益率 = (期末价值 - 期初价值) / 期初价值
年化收益率 = (1 + 总收益率)^(365/持仓天数) - 1

// 风险调整收益
夏普比率 = (年化收益率 - 无风险利率) / 年化波动率

// 回撤指标
最大回撤 = MAX((峰值 - 当前值) / 峰值)

// 交易指标
胜率 = 盈利次数 / 总交易次数
盈亏比 = 平均盈利 / 平均亏损
平均持仓天数 = Σ(持仓天数) / 总交易次数
```

---

## 🗄️ 数据库设计

### decisions (决策记录表)
```sql
CREATE TABLE decisions (
  id SERIAL PRIMARY KEY,
  stock_code VARCHAR(20) NOT NULL,
  decision_date DATE NOT NULL,
  decision_type VARCHAR(10) NOT NULL, -- BUY/SELL/HOLD

  -- 评分
  technical_score DECIMAL(5,2),
  fund_flow_score DECIMAL(5,2),
  news_score DECIMAL(5,2),
  sector_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),

  -- 风险评估
  risk_level VARCHAR(20),
  risk_score DECIMAL(5,2),

  -- 决策详情
  confidence DECIMAL(3,2),
  position_size DECIMAL(5,2), -- 建议仓位百分比
  expected_return DECIMAL(5,2),
  reason TEXT,

  -- 执行和结果
  status VARCHAR(20), -- PENDING/EXECUTED/CANCELLED
  executed_at TIMESTAMP,
  actual_return DECIMAL(5,2),
  holding_days INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_decisions_stock_date ON decisions(stock_code, decision_date DESC);
CREATE INDEX idx_decisions_type ON decisions(decision_type);
CREATE INDEX idx_decisions_score ON decisions(overall_score);
```

### decision_factors (决策因子表)
```sql
CREATE TABLE decision_factors (
  id SERIAL PRIMARY KEY,
  decision_id INTEGER REFERENCES decisions(id),

  -- 技术指标
  ma_trend VARCHAR(20),
  macd_signal VARCHAR(20),
  rsi_value DECIMAL(5,2),
  kdj_value VARCHAR(20),
  boll_position VARCHAR(20),

  -- 资金流向
  main_flow DECIMAL(20,2),
  consecutive_days INTEGER,

  -- 新闻事件
  event_ids JSONB,
  sentiment VARCHAR(20),
  importance_score DECIMAL(3,2),

  -- 板块数据
  sector_name VARCHAR(50),
  sector_heat DECIMAL(5,2),
  sector_flow DECIMAL(20,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### backtest_results (回测结果表)
```sql
CREATE TABLE backtest_results (
  id SERIAL PRIMARY KEY,
  backtest_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 收益指标
  total_return DECIMAL(10,4),
  annual_return DECIMAL(10,4),
  benchmark_return DECIMAL(10,4),

  -- 风险指标
  max_drawdown DECIMAL(5,4),
  volatility DECIMAL(5,4),
  sharpe_ratio DECIMAL(5,2),

  -- 交易指标
  total_trades INTEGER,
  win_rate DECIMAL(5,2),
  profit_loss_ratio DECIMAL(5,2),
  avg_holding_days DECIMAL(5,2),

  -- 详细记录
  trade_details JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API接口设计

### 决策相关接口

```javascript
// 1. 生成投资决策
POST /api/v2/decision/generate
Body: {
  "stockCode": "000001.SZ",
  "decisionDate": "2026-02-25"
}
Response: {
  "success": true,
  "data": {
    "stockCode": "000001.SZ",
    "decision": "BUY",
    "confidence": 0.85,
    "scores": {
      "technical": 75.5,
      "fundFlow": 68.0,
      "news": 82.0,
      "sector": 70.0,
      "overall": 74.5
    },
    "risk": {
      "level": "MEDIUM",
      "score": 45.0
    },
    "recommendation": {
      "action": "中仓买入",
      "positionSize": 20, // 20%仓位
      "expectedReturn": 15.5, // 预期15.5%收益
      "stopLoss": -8.0, // 止损-8%
      "takeProfit": 20.0 // 止盈+20%
    },
    "reason": "技术面多头排列,MACD金叉,主力资金连续3天流入,...",
    "factors": { ... }
  }
}

// 2. 批量生成决策
POST /api/v2/decision/batch-generate
Body: {
  "stockCodes": ["000001.SZ", "600000.SH"],
  "decisionDate": "2026-02-25"
}

// 3. 获取决策历史
GET /api/v2/decision/history/:stockCode
Query: ?startDate=2026-01-01&endDate=2026-02-25&limit=50

// 4. 获取最新决策
GET /api/v2/decision/latest/:stockCode

// 5. 执行决策
POST /api/v2/decision/:decisionId/execute
Body: {
  "executedAt": "2026-02-25T10:00:00Z",
  "price": 15.50
}

// 6. 更新决策结果
PUT /api/v2/decision/:decisionId/result
Body: {
  "actualReturn": 12.5,
  "holdingDays": 15
}
```

### 回测相关接口

```javascript
// 1. 运行回测
POST /api/v2/backtest/run
Body: {
  "stockCode": "000001.SZ",
  "startDate": "2025-01-01",
  "endDate": "2026-02-25",
  "initialCapital": 100000
}

// 2. 获取回测结果
GET /api/v2/backtest/:backtestId

// 3. 获取回测历史
GET /api/v2/backtest/history
```

### 评分相关接口

```javascript
// 1. 计算综合评分
POST /api/v2/scoring/calculate
Body: {
  "stockCode": "000001.SZ",
  "includeFactors": ["technical", "fundFlow", "news", "sector"]
}

// 2. 获取评分历史
GET /api/v2/scoring/history/:stockCode

// 3. 评分排行榜
GET /api/v2/scoring/ranking
Query: ?sector=银行&limit=10
```

---

## 📅 开发计划

### Week 1: 评分系统 (Days 1-7)
```
Day 1-2: 技术面评分模块
  - 趋势指标评分
  - 动量指标评分
  - 超买超卖评分
  - 波动性评分

Day 3-4: 资金面和消息面评分
  - 资金流向评分
  - 事件重要性评分
  - 情感倾向评分
  - 历史影响评分

Day 5-6: 板块面评分和综合评分
  - 板块热度评分
  - 板块资金评分
  - 加权综合评分
  - 评分等级划分

Day 7: 测试和文档
  - 单元测试
  - 集成测试
  - API文档
```

### Week 2: 决策引擎 (Days 8-14)
```
Day 8-10: 决策逻辑实现
  - 买入规则实现
  - 卖出规则实现
  - 持有规则实现
  - 置信度计算

Day 11-12: 风险评估模型
  - 波动率风险
  - 最大回撤风险
  - 仓位风险
  - 集中度风险

Day 13-14: 决策追踪系统
  - 决策记录
  - 结果追踪
  - 准确率统计
```

### Week 3: 回测系统 (Days 15-21)
```
Day 15-17: 回测引擎
  - 历史数据回放
  - 模拟交易
  - 收益率计算

Day 18-19: 统计分析
  - 夏普比率
  - 最大回撤
  - 胜率和盈亏比

Day 20-21: 可视化和报告
  - 收益曲线
  - 回测报告
```

### Week 4: 集成和测试 (Days 22-28)
```
Day 22-24: 系统集成
  - API路由
  - 前端对接
  - 端到端测试

Day 25-27: 优化和调试
  - 性能优化
  - 参数调优
  - Bug修复

Day 28: 文档和发布
  - 完善文档
  - 用户手册
  - 发布准备
```

---

## 🎯 验收标准

### 功能验收
```
✅ 综合评分系统
   - 四维评分准确
   - 加权计算正确
   - 等级划分合理

✅ 决策引擎
   - 买入/卖出/持有决策正确
   - 置信度计算合理
   - 理由生成完整

✅ 风险评估
   - 风险维度全面
   - 风险等级准确
   - 风控有效

✅ 回测系统
   - 历史回测准确
   - 收益计算正确
   - 指标完整

✅ API接口
   - 接口完整可用
   - 响应时间<500ms
   - 错误处理完善
```

### 性能验收
```
✅ 评分计算: <200ms
✅ 决策生成: <300ms
✅ 风险评估: <150ms
✅ 回测运行: <5s (1年数据)
✅ API响应: <500ms (平均)
```

### 质量验收
```
✅ 代码覆盖率: ≥80%
✅ 单元测试: 全部通过
✅ 集成测试: 全部通过
✅ 文档完整度: ≥90%
✅ Git提交规范: 符合标准
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**作者**: AI Investment Decision Assistant Team
