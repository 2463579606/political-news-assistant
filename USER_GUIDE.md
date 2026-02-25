# AI投资决策助手 v2.0 - 使用手册

## 目录
1. [快速开始](#快速开始)
2. [核心功能](#核心功能)
3. [API使用指南](#api使用指南)
4. [最佳实践](#最佳实践)
5. [常见问题](#常见问题)

---

## 1. 快速开始

### 1.1 第一个决策

```bash
# 生成投资决策
curl -X POST http://localhost:3000/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "stockCode": "000001.SZ",
    "decision": "HOLD",
    "decisionLevel": "CAUTIOUS",
    "scores": {
      "technical": 42.55,
      "fundFlow": 47.52,
      "news": 56.60,
      "sector": 50.00,
      "overall": 49.25
    },
    "grade": "E",
    "confidence": 0.7,
    "recommendation": {
      "action": "谨慎持有，准备减仓",
      "positionSize": -10,
      "stopLoss": -10,
      "takeProfit": 10
    }
  }
}
```

### 1.2 第一次回测

```bash
# 运行回测
curl -X POST http://localhost:3000/api/v2/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "options": {
      "initialCapital": 1000000,
      "saveToDb": true
    }
  }'
```

---

## 2. 核心功能

### 2.1 智能评分系统

#### 四维评分

**技术面** (30%权重)
- MA趋势分析
- MACD动量指标
- RSI/KDJ超买超卖
- BOLL波动性

**资金面** (20%权重)
- 主力资金流向
- 连续流入流出
- 散户情绪

**消息面** (30%权重)
- 事件重要性
- 情感倾向
- 历史相似度

**板块面** (20%权重)
- 板块热度
- 板块资金流向

#### 评分等级

| 分数区间 | 等级 | 建议 |
|---------|------|------|
| 90-100 | A+ | 强烈买入 |
| 80-89 | A | 买入 |
| 70-79 | B | 谨慎买入 |
| 60-69 | C | 持有 |
| 50-59 | D | 考虑减仓 |
| 40-49 | E | 减仓 |
| 0-39 | F | 卖出 |

### 2.2 决策类型

#### BUY（买入）
- **STRONG**: 评分≥90，强烈建议买入
- **MODERATE**: 评分≥80，建议买入
- **LIGHT**: 评分≥70，谨慎买入

#### SELL（卖出）
- **STRONG**: 评分≤30，强烈建议卖出
- **MODERATE**: 评分≤40，建议卖出
- **RISK_CONTROL**: 风险控制，立即卖出

#### HOLD（持有）
- **POSITIVE**: 评分55-70，继续持有
- **NEUTRAL**: 评分40-55，观望
- **CAUTIOUS**: 评分<40，谨慎持有

### 2.3 风险评估

#### 四维风险

**波动性风险** (30%)
- 年化波动率
- 评级: LOW/MEDIUM/HIGH

**回撤风险** (30%)
- 最大回撤
- 评级: LOW/MEDIUM/HIGH

**仓位风险** (20%)
- 当前仓位
- 建议最大仓位

**集中度风险** (20%)
- 板块集中度
- 分散投资建议

---

## 3. API使用指南

### 3.1 决策引擎API

#### 生成单个决策

```http
POST /api/v2/decision/generate
Content-Type: application/json

{
  "stockCode": "000001.SZ",
  "includeRisk": true,
  "saveToDb": false
}
```

#### 批量生成决策

```http
POST /api/v2/decision/batch-generate
Content-Type: application/json

{
  "stockCodes": ["000001.SZ", "600000.SH", "000001.SZ"],
  "includeRisk": true
}
```

#### 获取决策历史

```http
GET /api/v2/decision/history/000001.SZ?limit=50
```

#### 获取最新决策

```http
GET /api/v2/decision/latest/000001.SZ
```

### 3.2 评分系统API

#### 计算综合评分

```http
POST /api/v2/decision/scoring/calculate
Content-Type: application/json

{
  "stockCode": "000001.SZ",
  "includeFactors": ["technical", "fundFlow", "news", "sector"]
}
```

#### 批量计算评分

```http
POST /api/v2/decision/scoring/batch-calculate
Content-Type: application/json

{
  "stockCodes": ["000001.SZ", "600000.SH"]
}
```

### 3.3 回测系统API

#### 运行回测

```http
POST /api/v2/backtest/run
Content-Type: application/json

{
  "stockCode": "000001.SZ",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "options": {
    "initialCapital": 1000000,
    "commissionRate": 0.0003,
    "slippageRate": 0.001,
    "maxPosition": 0.3,
    "stopLoss": -0.08,
    "takeProfit": 0.15,
    "saveToDb": true
  }
}
```

**回测参数说明**:

| 参数 | 说明 | 默认值 |
|------|------|--------|
| initialCapital | 初始资金 | 1000000 |
| commissionRate | 手续费率 | 0.0003 (0.03%) |
| slippageRate | 滑点率 | 0.001 (0.1%) |
| maxPosition | 最大仓位 | 0.3 (30%) |
| stopLoss | 止损 | -0.08 (-8%) |
| takeProfit | 止盈 | 0.15 (15%) |

#### 批量回测

```http
POST /api/v2/backtest/batch-run
Content-Type: application/json

{
  "stockCodes": ["000001.SZ", "600000.SH"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "options": {...}
}
```

#### 获取回测结果

```http
GET /api/v2/backtest/results/1
```

#### 获取回测报告

```http
GET /api/v2/backtest/results/1/report
```

### 3.4 参数优化API

#### 网格搜索

```http
POST /api/v2/optimization/grid-search
Content-Type: application/json

{
  "stockCode": "000001.SZ",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "paramGrid": {
    "buyThreshold": [70, 75, 80],
    "sellThreshold": [30, 35, 40],
    "maxPosition": [0.2, 0.3, 0.4],
    "stopLoss": [-0.05, -0.08, -0.10],
    "takeProfit": [0.10, 0.15, 0.20]
  },
  "targetMetric": "sharpeRatio"
}
```

**优化目标指标**:
- `sharpeRatio` - 夏普比率（默认）
- `totalReturn` - 总收益率
- `annualReturn` - 年化收益率
- `winRate` - 胜率
- `profitLossRatio` - 盈亏比
- `maxDrawdown` - 最大回撤（越小越好）

### 3.5 监控系统API

#### 获取监控状态

```http
GET /api/v2/monitoring/status
```

#### 健康检查

```http
GET /api/v2/monitoring/health
```

#### 获取告警历史

```http
GET /api/v2/monitoring/alerts?limit=50
```

#### 生成日报

```http
GET /api/v2/monitoring/report/daily
```

---

## 4. 最佳实践

### 4.1 使用流程

#### 新手入门

1. **观察期** (1-2周)
   - 每日生成决策，观察系统表现
   - 记录决策建议和实际走势
   - 不进行实际交易

2. **回测验证** (1周)
   - 对多只股票进行历史回测
   - 分析胜率和盈亏比
   - 调整参数设置

3. **小资金试运行** (1个月)
   - 选择1-2只熟悉的股票
   - 使用小资金跟随决策
   - 严格止损止盈

4. **逐步扩大** (根据效果)
   - 增加股票数量
   - 调整仓位比例
   - 优化风控参数

#### 进阶使用

1. **参数优化**
   - 定期运行参数优化
   - 使用不同市场环境的数据
   - 平衡收益和风险

2. **组合管理**
   - 分散投资不同板块
   - 控制单一股票仓位
   - 动态调整持仓

3. **风险控制**
   - 严格执行止损止盈
   - 关注市场整体环境
   - 及时调整策略

### 4.2 参数调优建议

#### 决策阈值

**稳健型**:
```json
{
  "buyThreshold": 85,
  "sellThreshold": 30
}
```

**平衡型**（默认）:
```json
{
  "buyThreshold": 75,
  "sellThreshold": 35
}
```

**激进型**:
```json
{
  "buyThreshold": 70,
  "sellThreshold": 40
}
```

#### 风控参数

**保守型**:
```json
{
  "maxPosition": 0.2,
  "stopLoss": -0.05,
  "takeProfit": 0.10
}
```

**标准型**（默认）:
```json
{
  "maxPosition": 0.3,
  "stopLoss": -0.08,
  "takeProfit": 0.15
}
```

**激进型**:
```json
{
  "maxPosition": 0.5,
  "stopLoss": -0.10,
  "takeProfit": 0.20
}
```

### 4.3 常见使用场景

#### 场景1: 每日选股

```bash
# 1. 批量生成决策
curl -X POST http://localhost:3000/api/v2/decision/batch-generate \
  -H "Content-Type: application/json" \
  -d '{
    "stockCodes": ["000001.SZ", "600000.SH", "000001.SZ", "600519.SH"]
  }'

# 2. 筛选BUY决策的股票
# 3. 查看详细评分和风险
# 4. 选择合适的股票买入
```

#### 场景2: 策略回测

```bash
# 1. 运行回测
curl -X POST http://localhost:3000/api/v2/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "options": {"saveToDb": true}
  }'

# 2. 查看回测报告
curl http://localhost:3000/api/v2/backtest/results/1/report

# 3. 分析关键指标
# - 总收益率
# - 最大回撤
# - 夏普比率
# - 胜率
```

#### 场景3: 参数优化

```bash
# 1. 定义参数网格
curl -X POST http://localhost:3000/api/v2/optimization/grid-search \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "paramGrid": {
      "buyThreshold": [70, 75, 80],
      "sellThreshold": [30, 35, 40],
      "maxPosition": [0.2, 0.3]
    },
    "targetMetric": "sharpeRatio"
  }'

# 2. 等待优化完成

# 3. 使用最优参数更新配置
```

### 4.4 注意事项

#### ⚠️ 重要提醒

1. **不构成投资建议**
   - 系统输出仅供参考
   - 不构成任何投资建议
   - 投资有风险，入市需谨慎

2. **数据延迟**
   - 使用的历史数据可能有延迟
   - 实时决策需要最新数据
   - 注意数据更新时间

3. **市场变化**
   - 历史表现不代表未来
   - 市场环境在不断变化
   - 定期调整策略参数

4. **风险控制**
   - 严格执行止损
   - 控制仓位比例
   - 分散投资风险

5. **系统限制**
   - 基于已有数据计算
   - 无法预测突发事件
   - 技术分析的局限性

---

## 5. 常见问题

### 5.1 系统使用

**Q: 如何获取股票代码？**
```
A: A股代码格式:
   - 深交所: xxxxxx.SZ (如 000001.SZ)
   - 上交所: xxxxxx.SH (如 600000.SH)
```

**Q: 为什么评分都是50分？**
```
A: 可能原因:
   1. 没有相关数据（如新闻、资金流向）
   2. 数据过于陈旧
   3. 股票不在监控范围内
   解决: 检查数据更新状态，使用热门股票
```

**Q: 决策结果如何解读？**
```
A: 决策包含:
   - 决策类型: BUY/SELL/HOLD
   - 决策级别: STRONG/MODERATE/LIGHT/CAUTIOUS
   - 综合评分: 0-100分
   - 置信度: 0-1，越高越可靠
   - 投资建议: 具体操作建议
```

**Q: 如何提高决策准确率？**
```
A: 建议:
   1. 使用参数优化功能寻找最优参数
   2. 结合多个决策综合判断
   3. 关注市场整体环境
   4. 严格执行风控纪律
   5. 定期回测验证
```

### 5.2 回测相关

**Q: 回测结果可信吗？**
```
A: 回测特点:
   - 优点: 验证策略有效性
   - 局限: 存在过度拟合风险
   - 建议: 样本外验证，实盘检验
```

**Q: 为什么回测没有交易？**
```
A: 可能原因:
   1. 评分始终在HOLD区间
   2. 止损止盈设置不合理
   3. 市场数据不完整
   解决: 调整决策阈值，延长回测期间
```

**Q: 如何解读回测指标？**
```
A: 关键指标:
   - 夏普比率 > 1: 良好
   - 最大回撤 < 20%: 可控
   - 胜率 > 50%: 正常
   - 盈亏比 > 2: 优秀
```

### 5.3 性能优化

**Q: 如何加快回测速度？**
```
A: 优化方法:
   1. 使用批量回测（并发处理）
   2. 缩短回测期间
   3. 减少参数组合数量
   4. 使用缓存
```

**Q: 系统响应慢怎么办？**
```
A: 排查步骤:
   1. 检查数据库连接
   2. 查看系统资源使用
   3. 检查网络延迟
   4. 考虑使用缓存
```

### 5.4 数据相关

**Q: 数据多久更新一次？**
```
A: 更新频率:
   - 市场数据: 每日收盘后
   - 资金流向: 每日收盘后
   - 新闻事件: 实时/每日
   - 可配置定时任务自动更新
```

**Q: 如何添加新股票？**
```
A: 系统会自动处理:
   - 在A股范围内的股票都会被监控
   - 使用时直接输入股票代码即可
   - 系统会自动获取相关数据
```

---

## 6. 代码示例

### 6.1 Node.js示例

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v2';

// 生成决策
async function getDecision(stockCode) {
  const response = await axios.post(`${API_BASE}/decision/generate`, {
    stockCode: stockCode
  });
  return response.data.data;
}

// 运行回测
async function runBacktest(stockCode, startDate, endDate) {
  const response = await axios.post(`${API_BASE}/backtest/run`, {
    stockCode,
    startDate,
    endDate,
    options: {
      initialCapital: 1000000,
      saveToDb: true
    }
  });
  return response.data.data;
}

// 使用示例
async function main() {
  try {
    // 获取决策
    const decision = await getDecision('000001.SZ');
    console.log('决策:', decision.decision);
    console.log('评分:', decision.scores.overall);

    // 运行回测
    const backtest = await runBacktest('000001.SZ', '2024-01-01', '2024-12-31');
    console.log('收益率:', backtest.performance.return.totalReturnPercent);
    console.log('夏普比率:', backtest.performance.risk.sharpeRatio);

  } catch (error) {
    console.error('错误:', error.message);
  }
}

main();
```

### 6.2 Python示例

```python
import requests
import json

API_BASE = 'http://localhost:3000/api/v2'

def get_decision(stock_code):
    """生成投资决策"""
    response = requests.post(f'{API_BASE}/decision/generate', json={
        'stockCode': stock_code
    })
    return response.json()['data']

def run_backtest(stock_code, start_date, end_date):
    """运行回测"""
    response = requests.post(f'{API_BASE}/backtest/run', json={
        'stockCode': stock_code,
        'startDate': start_date,
        'endDate': end_date,
        'options': {
            'initialCapital': 1000000,
            'saveToDb': True
        }
    })
    return response.json()['data']

# 使用示例
if __name__ == '__main__':
    # 获取决策
    decision = get_decision('000001.SZ')
    print(f"决策: {decision['decision']}")
    print(f"评分: {decision['scores']['overall']}")

    # 运行回测
    backtest = run_backtest('000001.SZ', '2024-01-01', '2024-12-31')
    print(f"收益率: {backtest['performance']['return']['totalReturnPercent']}")
    print(f"夏普比率: {backtest['performance']['risk']['sharpeRatio']:.2f}")
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**作者**: Claude Code
