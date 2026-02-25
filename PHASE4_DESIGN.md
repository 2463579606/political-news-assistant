# Phase 4: 产品上线 - 设计文档

## 1. 概述

### 1.1 目标
将AI投资决策助手v2.0打造成一个完整、稳定、可用的产品，准备上线部署。

### 1.2 核心任务
1. **参数优化** - 自动寻找最优决策参数
2. **监控系统** - 实时监控数据和系统状态
3. **性能优化** - 提升系统响应速度
4. **部署文档** - 完整的部署和使用文档

---

## 2. 参数优化模块

### 2.1 功能设计

**优化目标**:
- 最大化年化收益率
- 最小化最大回撤
- 最大化夏普比率
- 最大化胜率

**优化参数**:
```javascript
{
  // 决策阈值
  buyThreshold: [70, 75, 80, 85],           // 买入阈值
  sellThreshold: [30, 35, 40, 45],          // 卖出阈值

  // 评分权重
  technicalWeight: [0.2, 0.25, 0.3, 0.35, 0.4],
  fundFlowWeight: [0.15, 0.2, 0.25],
  newsWeight: [0.25, 0.3, 0.35],
  sectorWeight: [0.15, 0.2, 0.25],

  // 风控参数
  maxPosition: [0.2, 0.3, 0.4, 0.5],        // 最大仓位
  stopLoss: [-0.05, -0.08, -0.10, -0.12],   // 止损
  takeProfit: [0.10, 0.15, 0.20, 0.25],     // 止盈

  // 交易成本
  commissionRate: [0.0001, 0.0003, 0.0005],  // 手续费率
  slippageRate: [0.0005, 0.001, 0.002]       // 滑点率
}
```

### 2.2 优化算法

#### 2.2.1 网格搜索 (Grid Search)
- **原理**: 遍历所有参数组合
- **优点**: 找到全局最优解
- **缺点**: 计算量大
- **适用**: 参数空间较小的场景

#### 2.2.2 遗传算法 (Genetic Algorithm)
- **原理**: 模拟生物进化过程
- **优点**: 快速收敛到较优解
- **缺点**: 可能陷入局部最优
- **适用**: 参数空间较大的场景

#### 2.2.3 贝叶斯优化 (Bayesian Optimization)
- **原理**: 基于概率模型选择最有前景的参数
- **优点**: 高效，适合昂贵的目标函数
- **缺点**: 实现复杂
- **适用**: 参数优化目标是运行回测的场景

### 2.3 核心类设计

**文件**: `services/optimization/parameter-optimizer.js`

```javascript
class ParameterOptimizer {
  // 网格搜索
  async gridSearch(stockCode, startDate, endDate, paramGrid, targetMetric) {
    // 1. 生成所有参数组合
    // 2. 并行运行回测
    // 3. 按目标指标排序
    // 4. 返回最优参数
  }

  // 遗传算法
  async geneticOptimize(stockCode, startDate, endDate, options) {
    // 1. 初始化种群
    // 2. 评估适应度（运行回测）
    // 3. 选择、交叉、变异
    // 4. 迭代进化
    // 5. 返回最优个体
  }

  // 贝叶斯优化
  async bayesianOptimize(stockCode, startDate, endDate, options) {
    // 1. 初始采样
    // 2. 构建代理模型（高斯过程）
    // 3. 采集函数选择下一个参数
    // 4. 更新模型
    // 5. 返回最优参数
  }

  // 多目标优化
  async multiObjectiveOptimize(stockCode, startDate, endDate, objectives) {
    // 帕累托前沿优化
    // 平衡收益和风险
  }
}
```

### 2.4 API接口

```
POST /api/v2/optimization/grid-search
POST /api/v2/optimization/genetic
POST /api/v2/optimization/bayesian
GET  /api/v2/optimization/results/:id
```

---

## 3. 监控告警系统

### 3.1 监控指标

#### 3.1.1 数据监控
- **市场数据更新**: 最新数据时间、缺失数据
- **资金流向更新**: 更新频率、数据完整性
- **新闻事件**: 每日事件数量、情感分布
- **向量检索**: ChromaDB状态、索引大小

#### 3.1.2 系统监控
- **API响应时间**: P50/P95/P99
- **错误率**: 4xx/5xx比例
- **并发连接数**: 当前连接数
- **内存使用**: Heap/Node使用情况
- **CPU使用**: 系统CPU占用

#### 3.1.3 业务监控
- **决策生成**: 每日决策数量、分布
- **回测执行**: 回测次数、成功率
- **评分异常**: 极端分数、突变检测
- **风险预警**: 高风险股票数量

### 3.2 告警规则

**告警级别**:
- **INFO**: 信息通知
- **WARNING**: 警告（需要注意）
- **ERROR**: 错误（需要处理）
- **CRITICAL**: 严重（立即处理）

**告警示例**:
```javascript
{
  // 数据更新延迟
  {
    level: 'WARNING',
    type: 'DATA_DELAY',
    message: '市场数据延迟超过30分钟',
    threshold: 30 * 60 * 1000,
    current: 45 * 60 * 1000
  },

  // API错误率过高
  {
    level: 'ERROR',
    type: 'HIGH_ERROR_RATE',
    message: 'API错误率超过5%',
    threshold: 0.05,
    current: 0.08
  },

  // 评分异常
  {
    level: 'INFO',
    type: 'SCORE_ANOMALY',
    message: '股票000001.SZ评分突然从80降到30',
    stockCode: '000001.SZ',
    before: 80,
    after: 30
  }
}
```

### 3.3 通知渠道

- **邮件**: 发送详细告警报告
- **Slack/钉钉**: 实时消息推送
- **Webhook**: 自定义webhook
- **日志**: 记录到日志文件

### 3.4 核心类设计

**文件**: `services/monitoring/monitoring-service.js`

```javascript
class MonitoringService {
  // 数据监控
  async checkDataFreshness() {
    // 检查各类数据的更新时间
  }

  async checkDataCompleteness() {
    // 检查数据完整性
  }

  // 系统监控
  async checkApiPerformance() {
    // 检查API响应时间
  }

  async checkErrorRate() {
    // 检查错误率
  }

  // 业务监控
  async checkDecisionAnomalies() {
    // 检测决策异常
  }

  // 告警发送
  async sendAlert(alert) {
    // 发送告警
  }

  // 生成监控报告
  async generateMonitoringReport() {
    // 生成日报/周报
  }
}
```

### 3.5 API接口

```
GET /api/v2/monitoring/status          - 获取监控状态
GET /api/v2/monitoring/metrics         - 获取监控指标
GET /api/v2/monitoring/alerts          - 获取告警历史
GET /api/v2/monitoring/report/daily    - 获取日报
GET /api/v2/monitoring/report/weekly   - 获取周报
```

---

## 4. 性能优化

### 4.1 数据库优化

#### 4.1.1 索引优化
```sql
-- 市场数据索引
CREATE INDEX idx_market_stock_date ON market_data(stock_code, trade_date DESC);
CREATE INDEX idx_market_date_range ON market_data(trade_date DESC)
  WHERE trade_date >= CURRENT_DATE - INTERVAL '60 days';

-- 资金流向索引
CREATE INDEX idx_fund_stock_date ON fund_flow(stock_code, trade_date DESC);

-- 新闻事件索引
CREATE INDEX idx_news_created ON news_events(created_at DESC);
CREATE INDEX idx_news_importance ON news_events(importance_score DESC)
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- GIN索引（JSONB字段）
CREATE INDEX idx_news_impact_stocks ON news_events USING GIN (impact_stocks);
CREATE INDEX idx_news_impact_sectors ON news_events USING GIN (impact_sectors);
```

#### 4.1.2 查询优化
- 使用连接池（pg-pool）
- 批量查询代替单条查询
- 预编译语句（PREPARE）
- 物化视图（Materialized Views）

### 4.2 缓存策略

#### 4.2.1 Redis缓存
```javascript
// 缓存技术指标
await redis.setex(
  `market:${stockCode}:indicators`,
  3600, // 1小时
  JSON.stringify(indicators)
);

// 缓存评分结果
await redis.setex(
  `score:${stockCode}:${date}`,
  86400, // 24小时
  JSON.stringify(score)
);

// 缓存决策结果
await redis.setex(
  `decision:${stockCode}:${date}`,
  43200, // 12小时
  JSON.stringify(decision)
);
```

#### 4.2.2 本地缓存
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10分钟

// 股票基本信息缓存
cache.set(`stock:${stockCode}:info`, info);
```

### 4.3 异步处理

#### 4.3.1 任务队列
使用Bull或BullMQ处理耗时任务:
```javascript
const Queue = require('bull');
const scoreQueue = new Queue('score-calculation');
const backtestQueue = new Queue('backtest');

// 批量评分任务
scoreQueue.process(async (job) => {
  const { stockCodes } = job.data;
  return await scoringService.batchCalculateScores(stockCodes);
});

// 批量回测任务
backtestQueue.process(async (job) => {
  const { stockCodes, startDate, endDate, options } = job.data;
  return await backtestEngine.batchBacktest(stockCodes, startDate, endDate, options);
});
```

#### 4.3.2 定时任务
```javascript
const cron = require('node-cron');

// 每日数据更新
cron.schedule('0 16 * * 1-5', async () => {
  // 周一到周五16:00更新数据
  await updateMarketData();
  await updateFundFlow();
  await updateNewsEvents();
});

// 每日评分计算
cron.schedule('0 17 * * 1-5', async () => {
  // 市场收盘后计算评分
  await calculateDailyScores();
});

// 每日监控报告
cron.schedule('0 18 * * *', async () => {
  // 每日18:00生成监控报告
  await generateDailyReport();
});
```

### 4.4 API优化

#### 4.4.1 响应压缩
```javascript
const compression = require('compression');
app.use(compression());
```

#### 4.4.2 限流
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制100次请求
});

app.use('/api/', limiter);
```

#### 4.4.3 分页
```javascript
// 所有列表接口都支持分页
GET /api/v2/decisions?page=1&limit=20
GET /api/v2/backtest/history?page=1&limit=20
```

---

## 5. 部署文档

### 5.1 系统要求

**硬件配置**:
- CPU: 4核以上
- 内存: 8GB以上
- 硬盘: 100GB以上SSD

**软件要求**:
- OS: Ubuntu 20.04+ / macOS 12+ / Windows 10+
- Node.js: v18+
- PostgreSQL: 14+
- Redis: 6+ (可选)
- ChromaDB: 0.4+

### 5.2 部署方式

#### 5.2.1 Docker部署（推荐）
```bash
# 构建镜像
docker build -t ai-investment-assistant:v2.0 .

# 运行容器
docker-compose up -d
```

#### 5.2.2 源码部署
```bash
# 克隆代码
git clone <repo-url>
cd political-news-assistant

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
vim .env

# 初始化数据库
npm run db:migrate

# 启动服务
npm start
```

### 5.3 环境变量

```bash
# 数据库配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=political_news
POSTGRES_USER=political_news_user
POSTGRES_PASSWORD=your_password

# Redis配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API配置
API_PORT=3000
API_HOST=0.0.0.0

# 第三方服务
TUSHARE_TOKEN=your_token
OPENAI_API_KEY=your_key

# 向量数据库
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 5.4 监控配置

```bash
# 告警邮件
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
ALERT_TO=alerts@example.com

# Webhook
WEBHOOK_URL=https://hooks.example.com/webhook
```

---

## 6. 使用文档

### 6.1 快速开始

#### 6.1.1 生成投资决策
```bash
curl -X POST http://localhost:3000/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ"
  }'
```

#### 6.1.2 运行回测
```bash
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

#### 6.1.3 参数优化
```bash
curl -X POST http://localhost:3000/api/v2/optimization/grid-search \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "paramGrid": {
      "buyThreshold": [70, 75, 80],
      "sellThreshold": [30, 35, 40]
    },
    "targetMetric": "sharpeRatio"
  }'
```

### 6.2 API文档

完整的API文档: `docs/API.md`

- 决策引擎API
- 回测系统API
- 参数优化API
- 监控API

---

## 7. 实施计划

### 阶段1: 参数优化 (2-3天)
- ✅ 实现网格搜索
- ✅ 实现遗传算法（可选）
- ✅ API接口
- ✅ 测试验证

### 阶段2: 监控系统 (2-3天)
- ✅ 数据监控
- ✅ 系统监控
- ✅ 业务监控
- ✅ 告警通知
- ✅ API接口

### 阶段3: 性能优化 (2天)
- ✅ 数据库索引优化
- ✅ Redis缓存
- ✅ 异步任务队列
- ✅ API优化

### 阶段4: 文档编写 (1-2天)
- ✅ 部署文档
- ✅ 使用手册
- ✅ API文档
- ✅ 运维手册

**总预计时间**: 7-10天

---

## 8. 成功标准

### 8.1 功能完整性
- ✅ 参数优化功能可用
- ✅ 监控告警正常工作
- ✅ 性能指标达标
- ✅ 文档完整清晰

### 8.2 性能指标
- API响应时间 < 100ms (P95)
- 单股回测 < 5秒/年
- 参数优化 < 10分钟（网格搜索）
- 系统可用性 > 99%

### 8.3 代码质量
- 测试覆盖率 > 80%
- 代码审查通过
- 无严重bug
- 符合编码规范

---

**文档版本**: v1.0
**创建日期**: 2026-02-25
**作者**: Claude Code
