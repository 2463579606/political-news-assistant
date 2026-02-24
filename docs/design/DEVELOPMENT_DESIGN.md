# 开发设计文档：AI智能投资决策助手 v2.0

**文档类型**: 开发设计
**创建日期**: 2026-02-24
**设计人**: Claude Sonnet 4.5
**版本**: v1.0
**状态**: 待评审

---

## 📋 目录

1. [系统架构设计](#系统架构设计)
2. [数据库设计](#数据库设计)
3. [API接口设计](#api接口设计)
4. [模块详细设计](#模块详细设计)
5. [代码结构](#代码结构)
6. [测试计划](#测试计划)

---

## 1️⃣ 系统架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Next.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │新闻列表  │  │决策详情  │  │评分展示  │  │历史追踪 │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────┐
│                    API网关层 (Express)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 路由     │  │ 认证     │  │ 限流     │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    业务逻辑层                            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  新闻分析引擎     │  │  市场分析引擎     │            │
│  │ - EventExtractor │  │ - TechnicalAnalyzer│          │
│  │ - SentimentAnalyzer│ │ - FundFlowAnalyzer│          │
│  │ - SectorMapper   │  │ - SectorAnalyzer │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐                                    │
│  │  决策引擎         │                                    │
│  │ - ComprehensiveScorer│                               │
│  │ - DecisionGenerator│                                │
│  └──────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    数据访问层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │ChromaDB  │  │外部API   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    外部服务                              │
│  ┌──────┐ ┌───────┐ ┌──────┐ ┌──────┐ ┌────────┐      │
│  │Claude│ │FinBERT│ │Tushare│ │东方财富│ │新闻源│ │
│  └──────┘ └───────┘ └──────┘ └──────┘ └────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技术选型确认

| 层次 | 技术选择 | 版本 | 说明 |
|-----|---------|------|------|
| 前端 | Next.js | 15.x | App Router |
| 前端 | React | 18.x | UI框架 |
| 前端 | TypeScript | 5.x | 类型安全 |
| 前端 | TailwindCSS | 3.x | 样式 |
| 前端 | shadcn/ui | latest | 组件库 |
| 后端 | Node.js | >=20.9.0 | 运行时 |
| 后端 | Express | 4.x | Web框架 |
| 后端 | TypeScript | 5.x | 类型安全 |
| 数据库 | PostgreSQL | >=13 | 主数据库 |
| 向量库 | ChromaDB | latest | 向量检索 |
| 技术分析 | TA-Lib (Node) | latest | 技术指标 |
| AI | Claude API | latest | 事件提取 |
| AI | FinBERT | - | 情感分析 |
| 数据 | Tushare | - | 行情数据 |

### 1.3 部署架构

```
开发环境 (本地)
├── 前端: localhost:3000
├── 后端: localhost:3001
├── PostgreSQL: localhost:5432
└── ChromaDB: localhost:8000

生产环境 (阿里云ECS)
├── Nginx (反向代理)
│   ├── 前端: / (静态文件)
│   └── 后端: /api (代理到3001)
├── 后端: Node.js (PM2管理)
├── PostgreSQL: 本地或RDS
└── ChromaDB: Docker容器
```

---

## 2️⃣ 数据库设计

### 2.1 数据库表结构

#### 表1: news (新闻表)

```sql
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    source VARCHAR(100) NOT NULL,  -- 人民日报/新华社/央视
    url VARCHAR(1000) UNIQUE,
    publish_time TIMESTAMP NOT NULL,
    crawl_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_publish_time (publish_time),
    INDEX idx_source (source)
);
```

#### 表2: news_events (新闻事件表)

```sql
CREATE TABLE news_events (
    id SERIAL PRIMARY KEY,
    news_id INTEGER REFERENCES news(id),

    -- 事件信息
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- 事件分类
    event_type VARCHAR(50) NOT NULL,  -- policy/meeting/macro_data/emergency/market
    importance_score DECIMAL(3,2) CHECK (importance_score BETWEEN 0 AND 10),  -- 1-10

    -- 情感分析
    sentiment VARCHAR(20) NOT NULL,  -- positive/neutral/negative
    sentiment_score DECIMAL(4,3) CHECK (sentiment_score BETWEEN -1 AND 1),  -- -1 to 1

    -- 影响评估
    impact_duration VARCHAR(20) NOT NULL,  -- short/medium/long
    impact_sectors JSONB,  -- ["科技", "金融", ...]
    impact_stocks JSONB,  -- ["000001", "600000", ...]

    -- 置信度
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),  -- 0-1

    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_event_type (event_type),
    INDEX idx_importance (importance_score),
    INDEX idx_sentiment (sentiment)
);
```

#### 表3: market_data (行情数据表)

```sql
CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,  -- 000001
    stock_name VARCHAR(100),

    -- K线数据
    trade_date DATE NOT NULL,
    open_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    volume BIGINT,
    amount DECIMAL(20,2),

    -- 技术指标
    ma5 DECIMAL(10,2),
    ma10 DECIMAL(10,2),
    ma20 DECIMAL(10,2),
    ma60 DECIMAL(10,2),
    macd DECIMAL(10,2),
    macd_signal DECIMAL(10,2),
    macd_hist DECIMAL(10,2),
    rsi6 DECIMAL(5,2),
    rsi12 DECIMAL(5,2),
    rsi24 DECIMAL(5,2),
    kdj_k DECIMAL(5,2),
    kdj_d DECIMAL(5,2),
    kdj_j DECIMAL(5,2),
    boll_upper DECIMAL(10,2),
    boll_mid DECIMAL(10,2),
    boll_lower DECIMAL(10,2),

    -- 唯一约束
    UNIQUE(stock_code, trade_date),

    -- 索引
    INDEX idx_stock_date (stock_code, trade_date),
    INDEX idx_trade_date (trade_date)
);
```

#### 表4: fund_flow (资金流向表)

```sql
CREATE TABLE fund_flow (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(100),
    trade_date DATE NOT NULL,

    -- 主力资金
    main_inflow DECIMAL(20,2),  -- 主力流入（万元）
    main_outflow DECIMAL(20,2),  -- 主力流出（万元）
    main_net DECIMAL(20,2),  -- 主力净流入（万元）
    main_net_ratio DECIMAL(5,2),  -- 主力净流入占比（%）

    -- 超大单
    superlarge_inflow DECIMAL(20,2),
    superlarge_outflow DECIMAL(20,2),
    superlarge_net DECIMAL(20,2),

    -- 大单
    large_inflow DECIMAL(20,2),
    large_outflow DECIMAL(20,2),
    large_net DECIMAL(20,2),

    -- 中单
    medium_inflow DECIMAL(20,2),
    medium_outflow DECIMAL(20,2),
    medium_net DECIMAL(20,2),

    -- 小单
    small_inflow DECIMAL(20,2),
    small_outflow DECIMAL(20,2),
    small_net DECIMAL(20,2),

    -- 北向资金
    northbound_inflow DECIMAL(20,2),
    northbound_outflow DECIMAL(20,2),
    northbound_net DECIMAL(20,2),

    -- 唯一约束
    UNIQUE(stock_code, trade_date),

    -- 索引
    INDEX idx_stock_date (stock_code, trade_date),
    INDEX idx_trade_date (trade_date),
    INDEX idx_main_net (main_net)
);
```

#### 表5: decisions (决策表)

```sql
CREATE TABLE decisions (
    id SERIAL PRIMARY KEY,

    -- 关联
    stock_code VARCHAR(10) NOT NULL,
    news_event_id INTEGER REFERENCES news_events(id),

    -- 决策信息
    decision_type VARCHAR(20) NOT NULL,  -- buy/sell/hold
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),  -- 0-1

    -- 评分
    total_score INTEGER CHECK (total_score BETWEEN 0 AND 100),
    news_score INTEGER CHECK (news_score BETWEEN 0 AND 100),
    technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 100),
    fund_score INTEGER CHECK (fund_score BETWEEN 0 AND 100),
    sector_score INTEGER CHECK (sector_score BETWEEN 0 AND 100),

    -- 目标价位
    target_price_1 DECIMAL(10,2),  -- 第一目标
    target_price_2 DECIMAL(10,2),  -- 第二目标
    stop_loss_price DECIMAL(10,2),  -- 止损价

    -- 风险评估
    risk_level VARCHAR(20),  -- low/medium/high
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),

    -- 决策依据
    reasoning TEXT,  -- 决策理由

    -- 时间
    decision_time TIMESTAMP NOT NULL,
    expire_time TIMESTAMP,  -- 建议过期时间

    -- 验证状态
    is_validated BOOLEAN DEFAULT FALSE,
    actual_result DECIMAL(5,2),  -- 实际涨跌幅（%）

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    INDEX idx_stock (stock_code),
    INDEX idx_decision_time (decision_time),
    INDEX idx_decision_type (decision_type),
    INDEX idx_validated (is_validated)
);
```

#### 表6: sector_rotation (板块轮动表)

```sql
CREATE TABLE sector_rotation (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,

    -- 板块信息
    sector_code VARCHAR(20) NOT NULL,
    sector_name VARCHAR(100) NOT NULL,

    -- 热度指标
    hot_score DECIMAL(5,2),  -- 热度评分（0-100）
    rank_position INTEGER,  -- 排名

    -- 资金流向
    fund_inflow DECIMAL(20,2),  -- 板块资金流入（万元）
    fund_outflow DECIMAL(20,2),
    fund_net DECIMAL(20,2),

    -- 涨跌统计
    avg_change_pct DECIMAL(5,2),  -- 平均涨跌幅（%）
    rising_stocks INTEGER,  -- 上涨股票数
    falling_stocks INTEGER,  -- 下跌股票数
    limit_up_stocks INTEGER,  -- 涨停股票数
    limit_down_stocks INTEGER,  -- 跌停股票数

    UNIQUE(sector_code, date),

    INDEX idx_date (date),
    INDEX idx_hot_score (hot_score)
);
```

### 2.2 向量数据库设计 (ChromaDB)

```javascript
// Collection: news_events_vectors
{
  collection_name: "news_events_vectors",
  metadata: {
    event_id: "事件ID",
    event_type: "事件类型",
    sentiment: "情感",
    importance: "重要性"
  },
  embedding_function: "text-embedding-ada-002" // 或使用本地模型
}

// 文档结构
{
  ids: ["event_1", "event_2", ...],
  embeddings: [[0.1, 0.2, ...], [0.3, 0.4, ...]],  // 向量
  metadatas: [
    {event_id: 1, event_type: "policy", sentiment: "positive", importance: 8.5},
    ...
  ],
  documents: [
    "央行宣布降准0.5个百分点，释放长期资金约1万亿元...",
    ...
  ]
}
```

---

## 3️⃣ API接口设计

### 3.1 新闻相关接口

#### 3.1.1 获取新闻列表
```
GET /api/news

Query Parameters:
  - page: number (default: 1)
  - pageSize: number (default: 20)
  - source: string (optional) - 人民日报/新华社/央视
  - startDate: date (optional)
  - endDate: date (optional)

Response:
{
  "success": true,
  "data": {
    "total": 100,
    "list": [
      {
        "id": 1,
        "title": "央行宣布降准0.5个百分点",
        "source": "新华社",
        "publishTime": "2026-02-24T10:00:00Z",
        "url": "https://...",
        "hasEvent": true  // 是否已提取事件
      }
    ]
  }
}
```

#### 3.1.2 提取新闻事件
```
POST /api/news/:newsId/extract-event

Response:
{
  "success": true,
  "data": {
    "eventId": 123,
    "eventType": "policy",
    "title": "央行降准",
    "importanceScore": 9.0,
    "sentiment": "positive",
    "sentimentScore": 0.8,
    "impactDuration": "medium",
    "impactSectors": ["银行", "券商"],
    "confidence": 0.85
  }
}
```

#### 3.1.3 获取事件详情
```
GET /api/events/:eventId

Response:
{
  "success": true,
  "data": {
    "id": 123,
    "title": "央行降准",
    "eventType": "policy",
    "importanceScore": 9.0,
    "sentiment": "positive",
    "impactSectors": ["银行", "券商"],
    "impactStocks": ["000001", "600000"],
    "similarEvents": [...]  // 相似事件
  }
}
```

### 3.2 行情数据接口

#### 3.2.1 获取股票K线数据
```
GET /api/market/stock/:stockCode/kline

Query Parameters:
  - period: string (daily/weekly/monthly) - default: daily
  - startDate: date
  - endDate: date

Response:
{
  "success": true,
  "data": {
    "stockCode": "000001",
    "stockName": "平安银行",
    "klines": [
      {
        "date": "2026-02-24",
        "open": 10.50,
        "close": 10.80,
        "high": 10.90,
        "low": 10.45,
        "volume": 1000000,
        "amount": 10800000
      }
    ],
    "indicators": {
      "ma": [10.1, 10.3, 10.5],  // MA5, MA10, MA20
      "macd": {"macd": 0.1, "signal": 0.08, "hist": 0.02},
      "rsi": {"rsi6": 65, "rsi12": 60, "rsi24": 55},
      "kdj": {"k": 70, "d": 65, "j": 80},
      "boll": {"upper": 11.0, "mid": 10.5, "lower": 10.0}
    }
  }
}
```

#### 3.2.2 获取资金流向
```
GET /api/market/stock/:stockCode/fund-flow

Query Parameters:
  - days: number (default: 5) - 最近N天

Response:
{
  "success": true,
  "data": {
    "stockCode": "000001",
    "flows": [
      {
        "date": "2026-02-24",
        "mainNet": 5000,  // 万元
        "mainNetRatio": 2.5,  // %
        "superlargeNet": 3000,
        "largeNet": 2000,
        "northboundNet": 1000
      }
    ],
    "summary": {
      "totalMainNet": 25000,  // N天累计
      "avgMainNetRatio": 2.8,
      "trend": "inflow"  // inflow/outflow
    }
  }
}
```

### 3.3 决策相关接口

#### 3.3.1 生成投资决策
```
POST /api/decisions/generate

Request Body:
{
  "stockCode": "000001",
  "newsEventIds": [123, 124]  // 关联的事件ID
}

Response:
{
  "success": true,
  "data": {
    "decisionId": 456,
    "stockCode": "000001",
    "stockName": "平安银行",
    "decisionType": "buy",  // buy/sell/hold
    "confidence": 0.75,

    "scores": {
      "total": 75,
      "news": 80,  // 新闻面得分
      "technical": 70,  // 技术面得分
      "fund": 75,  // 资金面得分
      "sector": 78  // 板块面得分
    },

    "targets": {
      "targetPrice1": 11.50,
      "targetPrice2": 12.00,
      "stopLossPrice": 10.20
    },

    "risk": {
      "level": "medium",
      "score": 45
    },

    "reasoning": "央行降准利好银行股，技术面MACD金叉...",
    "basedOn": {
      "newsEvents": [...],
      "technicalIndicators": {...},
      "fundFlow": {...},
      "sectorRotation": {...}
    }
  }
}
```

#### 3.3.2 获取决策历史
```
GET /api/decisions

Query Parameters:
  - stockCode: string (optional)
  - decisionType: string (optional)
  - startDate: date
  - endDate: date
  - page: number
  - pageSize: number

Response:
{
  "success": true,
  "data": {
    "total": 50,
    "list": [
      {
        "decisionId": 456,
        "stockCode": "000001",
        "decisionType": "buy",
        "totalScore": 75,
        "decisionTime": "2026-02-24T10:00:00Z",
        "isValidated": false,
        "actualResult": null  // 如果已验证，显示实际结果
      }
    ]
  }
}
```

### 3.4 板块相关接口

#### 3.4.1 获取板块轮动
```
GET /api/sectors/rotation

Query Parameters:
  - date: date (default: 今天)

Response:
{
  "success": true,
  "data": {
    "date": "2026-02-24",
    "hotSectors": [
      {
        "sectorCode": "BK0001",
        "sectorName": "银行",
        "hotScore": 85,
        "rank": 1,
        "fundNet": 50000,
        "avgChangePct": 2.5,
        "risingStocks": 35,
        "limitUpStocks": 3
      }
    ],
    "coldSectors": [...]
  }
}
```

### 3.5 系统接口

#### 3.5.1 健康检查
```
GET /api/health

Response:
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-24T10:00:00Z",
    "services": {
      "database": "ok",
      "chromaDB": "ok",
      "claudeAPI": "ok",
      "tushareAPI": "ok"
    }
  }
}
```

---

## 4️⃣ 模块详细设计

### 4.1 新闻分析引擎

#### 4.1.1 EventExtractor (事件提取器)

**职责**: 从新闻中提取结构化事件

**类设计**:
```typescript
// src/backend/news-analysis/event-extractor.ts

interface NewsEvent {
  id: string;
  newsId: number;
  title: string;
  description: string;
  eventType: 'policy' | 'meeting' | 'macro_data' | 'emergency' | 'market';
  importanceScore: number;  // 1-10
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;  // -1 to 1
  impactDuration: 'short' | 'medium' | 'long';
  impactSectors: string[];
  impactStocks: string[];
  confidence: number;  // 0-1
}

class EventExtractor {
  private claudeClient: Anthropic;
  private sentimentAnalyzer: SentimentAnalyzer;

  constructor() {
    this.claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.sentimentAnalyzer = new SentimentAnalyzer();
  }

  /**
   * 从新闻中提取事件
   */
  async extract(newsItem: NewsItem): Promise<NewsEvent> {
    // 1. 使用Claude API提取事件信息
    const eventDraft = await this.extractWithClaude(newsItem);

    // 2. 使用FinBERT验证情感分析
    const sentiment = await this.sentimentAnalyzer.analyze(
      newsItem.title + ' ' + newsItem.content
    );

    // 3. 合并结果
    const event: NewsEvent = {
      ...eventDraft,
      sentiment: sentiment.label,
      sentimentScore: sentiment.score,
      confidence: this.calculateConfidence(eventDraft, sentiment)
    };

    return event;
  }

  /**
   * 使用Claude API提取事件
   */
  private async extractWithClaude(newsItem: NewsItem): Promise<Partial<NewsEvent>> {
    const prompt = this.buildExtractionPrompt(newsItem);

    const response = await this.claudeClient.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    return this.parseClaudeResponse(response);
  }

  /**
   * 构建提取提示词
   */
  private buildExtractionPrompt(newsItem: NewsItem): string {
    return `请从以下新闻中提取重要事件信息，以JSON格式返回：

新闻标题：${newsItem.title}
新闻内容：${newsItem.content}
来源：${newsItem.source}
发布时间：${newsItem.publishTime}

请提取以下信息：
{
  "title": "事件标题（简短概括）",
  "description": "事件详细描述",
  "eventType": "事件类型（policy/meeting/macro_data/emergency/market）",
  "importanceScore": 重要性评分（1-10的数字，10为最重要），
  "impactDuration": "影响持续期（short/medium/long）",
  "impactSectors": ["受影响的行业板块1", "板块2"],
  "impactStocks": ["受影响的股票代码1", "代码2"],
  "reasoning": "分析理由"
}

只返回JSON，不要其他内容。`;
  }

  /**
   * 解析Claude响应
   */
  private parseClaudeResponse(response: any): Partial<NewsEvent> {
    try {
      const jsonStr = response.content[0].text;
      const data = JSON.parse(jsonStr);
      return data;
    } catch (error) {
      logger.error('Failed to parse Claude response', error);
      throw new Error('Invalid Claude response');
    }
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(eventDraft: any, sentiment: any): number {
    // 简单的置信度计算逻辑
    // 可以根据实际情况优化
    let confidence = 0.7;

    // 如果Claude和FinBERT情感分析一致，提高置信度
    if (eventDraft.sentiment === sentiment.label) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}

module.exports = EventExtractor;
```

#### 4.1.2 SentimentAnalyzer (情感分析器)

**职责**: 使用FinBERT进行情感分析

```typescript
// src/backend/news-analysis/sentiment-analyzer.ts

interface SentimentResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number;  // -1 to 1
  confidence: number;  // 0-1
}

class SentimentAnalyzer {
  private model: any;
  private tokenizer: any;

  constructor() {
    // 使用HuggingFace Transformers.js
    // 或者调用HuggingFace Inference API
  }

  /**
   * 分析文本情感
   */
  async analyze(text: string): Promise<SentimentResult> {
    // 方案1: 使用HuggingFace API
    if (process.env.HUGGINGFACE_API_KEY) {
      return await this.analyzeWithAPI(text);
    }

    // 方案2: 使用本地模型（需要先下载）
    return await this.analyzeWithLocal(text);
  }

  /**
   * 使用HuggingFace API分析
   */
  private async analyzeWithAPI(text: string): Promise<SentimentResult> {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/ProsusAI/finbert',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            return_all_scores: true
          }
        })
      }
    );

    const result = await response.json();
    return this.parseAPIResponse(result);
  }

  /**
   * 解析API响应
   */
  private parseAPIResponse(result: any): SentimentResult {
    // result格式: [[{label: 'positive', score: 0.8}, {label: 'neutral', score: 0.15}, ...]]
    const scores = result[0];

    // 找到最高分的标签
    const topScore = scores.reduce((max: any, item: any) =>
      item.score > max.score ? item : max
    );

    // 转换为-1到1的分数
    let score: number;
    if (topScore.label === 'positive') {
      score = topScore.score;
    } else if (topScore.label === 'negative') {
      score = -topScore.score;
    } else {
      score = 0;
    }

    return {
      label: topScore.label,
      score: score,
      confidence: topScore.score
    };
  }

  /**
   * 使用本地模型分析（Phase 3实现）
   */
  private async analyzeWithLocal(text: string): Promise<SentimentResult> {
    // TODO: Phase 3实现本地FinBERT部署
    // 暂时使用Claude API替代
    return {
      label: 'neutral',
      score: 0,
      confidence: 0.5
    };
  }
}

module.exports = SentimentAnalyzer;
```

#### 4.1.3 SectorMapper (板块映射器)

**职责**: 将事件映射到相关板块和股票

```typescript
// src/backend/news-analysis/sector-mapper.ts

class SectorMapper {
  private sectorStockMap: Map<string, string[]>;  // 板块 -> 股票列表

  constructor() {
    this.loadSectorStockMap();
  }

  /**
   * 将事件映射到板块
   */
  async mapEventToSectors(event: NewsEvent): Promise<string[]> {
    const keywords = this.extractKeywords(event);
    const sectors = this.findSectorsByKeywords(keywords);
    return sectors;
  }

  /**
   * 获取板块下的股票
   */
  async getStocksInSector(sectorCode: string): Promise<string[]> {
    return this.sectorStockMap.get(sectorCode) || [];
  }

  /**
   * 提取关键词
   */
  private extractKeywords(event: NewsEvent): string[] {
    const text = event.title + ' ' + event.description;
    // 简单分词（可以使用jieba等分词库优化）
    return text.split(/\s+/).filter(word => word.length > 1);
  }

  /**
   * 根据关键词查找板块
   */
  private findSectorsByKeywords(keywords: string[]): string[] {
    // 关键词到板块的映射
    const keywordSectorMap: Record<string, string> = {
      '降准': '银行',
      '降息': '银行',
      'LPR': '银行',
      '芯片': '半导体',
      '半导体': '半导体',
      '新能源': '新能源',
      '锂电池': '新能源',
      // ... 更多映射
    };

    const sectors = new Set<string>();
    keywords.forEach(keyword => {
      const sector = keywordSectorMap[keyword];
      if (sector) {
        sectors.add(sector);
      }
    });

    return Array.from(sectors);
  }

  /**
   * 加载板块-股票映射
   */
  private loadSectorStockMap() {
    // 从数据库或配置文件加载
    // 格式: {"银行": ["000001", "600000", ...], ...}
    this.sectorStockMap = new Map();
  }
}

module.exports = SectorMapper;
```

### 4.2 市场分析引擎

#### 4.2.1 TechnicalAnalyzer (技术分析器)

**职责**: 计算技术指标并评分

```typescript
// src/backend/market-analysis/technical-analyzer.ts

import * as talib from 'talib-ng';

interface TechnicalScore {
  score: number;  // 0-100
  signals: string[];  // 买卖信号
  indicators: any;  // 原始指标数据
}

class TechnicalAnalyzer {
  /**
   * 计算技术面评分
   */
  async calculateScore(stockCode: string): Promise<TechnicalScore> {
    // 1. 获取K线数据
    const klines = await this.getKlines(stockCode, 200);

    // 2. 计算各项技术指标
    const indicators = await this.calculateIndicators(klines);

    // 3. 根据指标评分
    const score = await this.scoreIndicators(indicators);

    // 4. 生成信号
    const signals = this.generateSignals(indicators);

    return {
      score: score.total,
      signals: signals,
      indicators: indicators
    };
  }

  /**
   * 计算技术指标
   */
  private async calculateIndicators(klines: Kline[]) {
    const closePrices = klines.map(k => k.close);
    const highPrices = klines.map(k => k.high);
    const lowPrices = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    // MA
    const ma5 = talib.MA(closePrices, { timePeriod: 5 });
    const ma10 = talib.MA(closePrices, { timePeriod: 10 });
    const ma20 = talib.MA(closePrices, { timePeriod: 20 });
    const ma60 = talib.MA(closePrices, { timePeriod: 60 });

    // MACD
    const macd = talib.MACD(closePrices, {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9
    });

    // RSI
    const rsi6 = talib.RSI(closePrices, { timePeriod: 6 });
    const rsi12 = talib.RSI(closePrices, { timePeriod: 12 });
    const rsi24 = talib.RSI(closePrices, { timePeriod: 24 });

    // KDJ
    const kdj = talib.STOCH(
      highPrices,
      lowPrices,
      closePrices,
      { fastk_period: 9, slowk_period: 3, slowd_period: 3 }
    );

    // BOLL
    const boll = talib.BBANDS(closePrices, {
      timePeriod: 20,
      nbDevUp: 2,
      nbDevDown: 2
    });

    return {
      ma: {
        ma5: this.getLast(ma5),
        ma10: this.getLast(ma10),
        ma20: this.getLast(ma20),
        ma60: this.getLast(ma60)
      },
      macd: {
        macd: this.getLast(macd.macd),
        signal: this.getLast(macd.signal),
        hist: this.getLast(macd.hist)
      },
      rsi: {
        rsi6: this.getLast(rsi6),
        rsi12: this.getLast(rsi12),
        rsi24: this.getLast(rsi24)
      },
      kdj: {
        k: this.getLast(kdj.slowk),
        d: this.getLast(kdj.slowd),
        j: this.calculateJ(kdj.slowk, kdj.slowd)
      },
      boll: {
        upper: this.getLast(boll.upper),
        mid: this.getLast(boll.middle),
        lower: this.getLast(boll.lower)
      }
    };
  }

  /**
   * 根据指标评分
   */
  private async scoreIndicators(indicators: any): Promise<{ total: number }> {
    let totalScore = 50;  // 基础分50分

    // MA评分（20分）
    const maScore = this.scoreMA(indicators.ma);
    totalScore += maScore;

    // MACD评分（20分）
    const macdScore = this.scoreMACD(indicators.macd);
    totalScore += macdScore;

    // RSI评分（15分）
    const rsiScore = this.scoreRSI(indicators.rsi);
    totalScore += rsiScore;

    // KDJ评分（15分）
    const kdjScore = this.scoreKDJ(indicators.kdj);
    totalScore += kdjScore;

    // BOLL评分（15分）
    const bollScore = this.scoreBOLL(indicators.boll);
    totalScore += bollScore;

    // 确保分数在0-100之间
    totalScore = Math.max(0, Math.min(100, totalScore));

    return { total: Math.round(totalScore) };
  }

  /**
   * MA评分逻辑
   */
  private scoreMA(ma: any): number {
    let score = 0;
    const currentPrice = ma.ma5;  // 使用当前价格

    // 多头排列
    if (currentPrice > ma.ma10 && ma.ma10 > ma.ma20 && ma.ma20 > ma.ma60) {
      score += 10;  // 强势
    } else if (currentPrice > ma.ma20) {
      score += 5;  // 中性偏多
    }

    // 金叉
    if (ma.ma5 > ma.ma10) {
      score += 5;
    }

    return score;
  }

  /**
   * MACD评分逻辑
   */
  private scoreMACD(macd: any): number {
    let score = 0;

    // 金叉
    if (macd.macd > macd.signal && macd.hist > 0) {
      score += 10;
    } else if (macd.macd > macd.signal) {
      score += 5;
    }

    // 柱状图
    if (macd.hist > 0 && macd.hist > this.previous(macd.hist)) {
      score += 5;  // 红柱放大
    }

    // 零轴上方
    if (macd.macd > 0 && macd.signal > 0) {
      score += 5;
    }

    return score;
  }

  /**
   * RSI评分逻辑
   */
  private scoreRSI(rsi: any): number {
    let score = 0;

    // RSI6在30-70之间且处于上升
    if (rsi.rsi6 > 30 && rsi.rsi6 < 70) {
      score += 5;
    }

    // RSI不过热
    if (rsi.rsi6 < 80 && rsi.rsi12 < 80) {
      score += 5;
    }

    // 超卖反弹
    if (rsi.rsi6 < 30 && rsi.rsi6 > this.previous(rsi.rsi6)) {
      score += 5;
    }

    return score;
  }

  /**
   * KDJ评分逻辑
   */
  private scoreKDJ(kdj: any): number {
    let score = 0;

    // 金叉
    if (kdj.k > kdj.d && kdj.k > this.previous(kdj.k)) {
      score += 8;
    }

    // 不超买
    if (kdj.k < 80 && kdj.d < 80) {
      score += 4;
    }

    // J值
    if (kdj.j > 0 && kdj.j < 100) {
      score += 3;
    }

    return score;
  }

  /**
   * BOLL评分逻辑
   */
  private scoreBOLL(boll: any): number {
    let score = 0;

    // 价格在中轨上方
    const currentPrice = boll.mid;  // 应该传入当前价格
    if (currentPrice > boll.mid) {
      score += 5;
    }

    // 不突破上轨（超买）
    if (currentPrice < boll.upper) {
      score += 5;
    }

    // 收口（突破前兆）
    const bandwidth = (boll.upper - boll.lower) / boll.mid;
    if (bandwidth < 0.1) {
      score += 5;  // 即将突破
    }

    return score;
  }

  /**
   * 生成信号
   */
  private generateSignals(indicators: any): string[] {
    const signals: string[] = [];

    if (indicators.ma.ma5 > indicators.ma.ma10) {
      signals.push('MA金叉');
    }
    if (indicators.macd.macd > indicators.macd.signal) {
      signals.push('MACD金叉');
    }
    if (indicators.kdj.k > indicators.kdj.d) {
      signals.push('KDJ金叉');
    }
    if (indicators.rsi.rsi6 < 30) {
      signals.push('RSI超卖');
    }

    return signals;
  }

  /**
   * 计算J值
   */
  private calculateJ(k: number[], d: number[]): number[] {
    return k.map((kVal, i) => 3 * kVal - 2 * d[i]);
  }

  /**
   * 获取数组最后一个值
   */
  private getLast(arr: number[]): number {
    return arr[arr.length - 1];
  }

  /**
   * 获取数组倒数第二个值
   */
  private previous(arr: number[]): number {
    return arr[arr.length - 2];
  }

  /**
   * 获取K线数据
   */
  private async getKlines(stockCode: string, limit: number): Promise<Kline[]> {
    // 从数据库或API获取
    return [];
  }
}

module.exports = TechnicalAnalyzer;
```

### 4.3 决策引擎

#### 4.3.1 ComprehensiveScorer (综合评分系统)

**职责**: 综合多维度评分

```typescript
// src/backend/decision/comprehensive-scorer.ts

interface ScoreBreakdown {
  news: {
    score: number;
    weight: number;
    details: any;
  };
  technical: {
    score: number;
    weight: number;
    details: any;
  };
  fund: {
    score: number;
    weight: number;
    details: any;
  };
  sector: {
    score: number;
    weight: number;
    details: any;
  };
}

interface ComprehensiveScore {
  totalScore: number;  // 0-100
  breakdown: ScoreBreakdown;
  confidence: number;  // 0-1
  recommendation: 'buy' | 'sell' | 'hold';
}

class ComprehensiveScorer {
  private newsAnalyzer: any;
  private technicalAnalyzer: any;
  private fundAnalyzer: any;
  private sectorAnalyzer: any;

  constructor() {
    this.newsAnalyzer = new NewsAnalyzer();
    this.technicalAnalyzer = new TechnicalAnalyzer();
    this.fundAnalyzer = new FundAnalyzer();
    this.sectorAnalyzer = new SectorAnalyzer();
  }

  /**
   * 计算综合评分
   */
  async calculateScore(
    stockCode: string,
    newsEvents: NewsEvent[]
  ): Promise<ComprehensiveScore> {

    // 1. 计算各维度得分
    const newsScore = await this.scoreNews(stockCode, newsEvents);
    const technicalScore = await this.scoreTechnical(stockCode);
    const fundScore = await this.scoreFund(stockCode);
    const sectorScore = await this.scoreSector(stockCode, newsEvents);

    // 2. 加权计算总分
    const weights = {
      news: 0.30,
      technical: 0.30,
      fund: 0.20,
      sector: 0.20
    };

    const totalScore =
      newsScore.score * weights.news +
      technicalScore.score * weights.technical +
      fundScore.score * weights.fund +
      sectorScore.score * weights.sector;

    // 3. 计算置信度
    const confidence = this.calculateConfidence({
      news: newsScore,
      technical: technicalScore,
      fund: fundScore,
      sector: sectorScore
    });

    // 4. 生成建议
    const recommendation = this.generateRecommendation(totalScore);

    return {
      totalScore: Math.round(totalScore),
      breakdown: {
        news: { ...newsScore, weight: weights.news },
        technical: { ...technicalScore, weight: weights.technical },
        fund: { ...fundScore, weight: weights.fund },
        sector: { ...sectorScore, weight: weights.sector }
      },
      confidence: confidence,
      recommendation: recommendation
    };
  }

  /**
   * 新闻面评分
   */
  private async scoreNews(
    stockCode: string,
    newsEvents: NewsEvent[]
  ): Promise<{ score: number, details: any }> {

    if (newsEvents.length === 0) {
      return { score: 50, details: { message: '无相关新闻事件' } };
    }

    let totalScore = 0;
    let totalWeight = 0;

    newsEvents.forEach(event => {
      // 基础分：根据重要性
      let score = 50 + event.importanceScore * 5;  // 55-100分

      // 情感调整
      if (event.sentiment === 'positive') {
        score += event.sentimentScore * 20;  // +20分
      } else if (event.sentiment === 'negative') {
        score -= Math.abs(event.sentimentScore) * 20;  // -20分
      }

      // 置信度调整
      score *= event.confidence;

      // 权重：越重要的事件权重越高
      const weight = event.importanceScore / 10;

      totalScore += score * weight;
      totalWeight += weight;
    });

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50;

    return {
      score: Math.max(0, Math.min(100, finalScore)),
      details: {
        eventCount: newsEvents.length,
        avgImportance: newsEvents.reduce((sum, e) => sum + e.importanceScore, 0) / newsEvents.length,
        avgSentiment: newsEvents.reduce((sum, e) => sum + e.sentimentScore, 0) / newsEvents.length
      }
    };
  }

  /**
   * 技术面评分
   */
  private async scoreTechnical(stockCode: string): Promise<{ score: number, details: any }> {
    const result = await this.technicalAnalyzer.calculateScore(stockCode);
    return {
      score: result.score,
      details: {
        signals: result.signals,
        indicators: result.indicators
      }
    };
  }

  /**
   * 资金面评分
   */
  private async scoreFund(stockCode: string): Promise<{ score: number, details: any }> {
    const fundFlow = await this.fundAnalyzer.analyze(stockCode, 5);

    let score = 50;

    // 主力资金净流入
    if (fundFlow.mainNet > 0) {
      score += Math.min(30, fundFlow.mainNetRatio * 10);  // 最多+30分
    } else {
      score -= Math.min(30, Math.abs(fundFlow.mainNetRatio) * 10);  // 最多-30分
    }

    // 北向资金
    if (fundFlow.northboundNet > 0) {
      score += 10;
    }

    // 连续流入天数
    if (fundFlow.consecutiveInflowDays >= 3) {
      score += 10;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      details: fundFlow
    };
  }

  /**
   * 板块面评分
   */
  private async scoreSector(
    stockCode: string,
    newsEvents: NewsEvent[]
  ): Promise<{ score: number, details: any }> {

    // 获取股票所属板块
    const sectors = await this.getSectors(stockCode);

    // 获取板块热度
    const sectorRotation = await this.sectorAnalyzer.getRotation();

    // 计算板块得分
    let score = 50;
    sectorRotation.forEach(sector => {
      if (sectors.includes(sector.sectorName)) {
        // 热度越高，得分越高
        score += (sector.hotScore - 50) * 0.5;  // -25到+25分
      }
    });

    return {
      score: Math.max(0, Math.min(100, score)),
      details: {
        sectors: sectors,
        hotSectors: sectorRotation.filter(s => sectors.includes(s.sectorName))
      }
    };
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(scores: any): number {
    // 简单的置信度计算
    // 如果各维度得分差异不大，置信度高
    const scoreValues = [
      scores.news.score,
      scores.technical.score,
      scores.fund.score,
      scores.sector.score
    ];

    const mean = scoreValues.reduce((a, b) => a + b) / scoreValues.length;
    const variance = scoreValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scoreValues.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，置信度越高
    let confidence = 1 - (stdDev / 100);
    confidence = Math.max(0.5, Math.min(1.0, confidence));

    return confidence;
  }

  /**
   * 生成建议
   */
  private generateRecommendation(totalScore: number): 'buy' | 'sell' | 'hold' {
    if (totalScore >= 70) {
      return 'buy';
    } else if (totalScore <= 40) {
      return 'sell';
    } else {
      return 'hold';
    }
  }

  /**
   * 获取股票所属板块
   */
  private async getSectors(stockCode: string): Promise<string[]> {
    // 从数据库查询
    return [];
  }
}

module.exports = ComprehensiveScorer;
```

---

## 5️⃣ 代码结构

### 5.1 后端代码结构

```
src/backend/
├── app.js                      # Express应用入口
├── server.js                   # 服务器启动
├── config/                     # 配置文件
│   ├── database.js            # 数据库配置
│   ├── redis.js               # Redis配置
│   └── apis.js                # API密钥配置
├── routes/                     # 路由
│   ├── news.js                # 新闻路由
│   ├── market.js              # 市场数据路由
│   ├── decisions.js           # 决策路由
│   ├── sectors.js             # 板块路由
│   └── health.js              # 健康检查路由
├── controllers/                # 控制器
│   ├── news-controller.js
│   ├── market-controller.js
│   ├── decisions-controller.js
│   └── sectors-controller.js
├── services/                   # 业务逻辑
│   ├── news-analysis/         # 新闻分析服务
│   │   ├── event-extractor.js
│   │   ├── sentiment-analyzer.js
│   │   ├── sector-mapper.js
│   │   └── similar-event-retriever.js
│   ├── market-analysis/       # 市场分析服务
│   │   ├── technical-analyzer.js
│   │   ├── fund-analyzer.js
│   │   └── sector-analyzer.js
│   ├── decision/              # 决策服务
│   │   ├── comprehensive-scorer.js
│   │   └── decision-generator.js
│   ├── data/                  # 数据服务
│   │   ├── news-crawler.js    # 新闻爬虫
│   │   ├── market-service.js  # 行情数据
│   │   └── fund-flow-service.js
│   └── ai/                    # AI服务
│       ├── claude-service.js
│       └── finbert-service.js
├── models/                     # 数据模型
│   ├── news.js
│   ├── news-event.js
│   ├── market-data.js
│   ├── fund-flow.js
│   ├── decision.js
│   └── sector-rotation.js
├── db/                         # 数据库
│   ├── pool.js                # 数据库连接池
│   └── queries/               # SQL查询
│       ├── news.queries.js
│       ├── market.queries.js
│       └── decisions.queries.js
├── middleware/                 # 中间件
│   ├── auth.js                # 认证
│   ├── errorHandler.js        # 错误处理
│   ├── logger.js              # 日志
│   └── rateLimiter.js         # 限流
├── utils/                      # 工具函数
│   ├── logger.js
│   ├── date.js
│   └── validator.js
├── jobs/                       # 定时任务
│   ├── news-crawler.job.js    # 新闻爬取
│   ├── market-sync.job.js     # 行情同步
│   └── decision-validate.job.js  # 决策验证
└── tests/                      # 测试
    ├── unit/                  # 单元测试
    └── integration/           # 集成测试
```

### 5.2 前端代码结构

```
src/frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx            # 根布局
│   ├── page.tsx              # 首页
│   ├── globals.css           # 全局样式
│   ├── news/                 # 新闻页面
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── decisions/            # 决策页面
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── sectors/              # 板块页面
│       └── page.tsx
├── components/                # 组件
│   ├── ui/                   # shadcn/ui组件
│   ├── news/                 # 新闻相关组件
│   │   ├── NewsList.tsx
│   │   ├── NewsCard.tsx
│   │   └── EventBadge.tsx
│   ├── decisions/            # 决策相关组件
│   │   ├── DecisionCard.tsx
│   │   ├── ScoreChart.tsx
│   │   └── RecommendationBadge.tsx
│   └── layout/               # 布局组件
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── lib/                       # 工具库
│   ├── api.ts                # API客户端
│   ├── utils.ts              # 工具函数
│   └── constants.ts          # 常量
├── hooks/                     # 自定义Hooks
│   ├── useNews.ts
│   ├── useDecisions.ts
│   └── useMarketData.ts
├── types/                     # TypeScript类型
│   ├── news.ts
│   ├── decision.ts
│   └── market.ts
└── public/                    # 静态资源
```

---

## 6️⃣ 测试计划

### 6.1 单元测试

**覆盖率目标**: > 80%

**测试工具**: Jest

**测试范围**:
- ✅ 事件提取逻辑
- ✅ 情感分析
- ✅ 技术指标计算
- ✅ 评分算法
- ✅ 数据验证

**示例**:
```typescript
// tests/unit/technical-analyzer.test.ts

describe('TechnicalAnalyzer', () => {
  it('should calculate MA correctly', async () => {
    const analyzer = new TechnicalAnalyzer();
    const klines = mockKlines();
    const indicators = await analyzer.calculateIndicators(klines);

    expect(indicators.ma.ma5).toBeDefined();
    expect(indicators.ma.ma10).toBeDefined();
  });

  it('should generate buy signal when MACD golden cross', async () => {
    const analyzer = new TechnicalAnalyzer();
    const result = await analyzer.calculateScore('000001');

    expect(result.signals).toContain('MACD金叉');
  });
});
```

### 6.2 集成测试

**测试范围**:
- ✅ API端到端测试
- ✅ 数据库集成
- ✅ 外部API集成（Claude, Tushare）

**示例**:
```typescript
// tests/integration/api.test.ts

describe('Decision API', () => {
  it('should generate decision', async () => {
    const response = await request(app)
      .post('/api/decisions/generate')
      .send({
        stockCode: '000001',
        newsEventIds: [1, 2]
      });

    expect(response.status).toBe(200);
    expect(response.body.data.decisionType).toBeDefined();
  });
});
```

### 6.3 性能测试

**测试工具**: Artillery 或 k6

**测试场景**:
- 并发用户: 100
- 持续时间: 5分钟
- 目标响应时间: < 1秒 (API)

### 6.4 准确率测试

**测试方法**:
1. 收集历史数据（过去1年）
2. 使用系统生成决策
3. 对比实际结果
4. 计算准确率

**目标**:
- Phase 2结束时: > 60%
- Phase 3结束时: > 70%

---

## 7️⃣ 部署计划

### 7.1 开发环境

**运行方式**:
```bash
# 后端
cd src/backend
npm install
npm run dev  # localhost:3001

# 前端
cd src/frontend
npm install
npm run dev  # localhost:3000
```

### 7.2 生产环境

**部署方式**: PM2 + Nginx

**步骤**:
```bash
# 1. 拉取代码
git pull origin master

# 2. 安装依赖
cd src/backend && npm install
cd src/frontend && npm run build

# 3. 启动后端（PM2）
pm2 start ecosystem.config.js

# 4. 配置Nginx
# /etc/nginx/sites-available/political-news-assistant

# 5. 重启Nginx
sudo nginx -s reload
```

---

## 8️⃣ 总结

### 8.1 设计亮点

1. **模块化**: 清晰的分层架构
2. **可扩展**: 易于添加新功能
3. **可测试**: 完整的测试计划
4. **可维护**: 规范的代码结构

### 8.2 关键决策

1. **Phase 1-3使用Claude API**: 避免FinGPT部署复杂度
2. **ChromaDB向量库**: 轻量易用
3. **PostgreSQL主数据库**: 成熟可靠
4. **Next.js 15**: 现代化前端框架

### 8.3 下一步

1. **需求评审通过**
2. **创建feature分支**
3. **开始Phase 1开发**

---

**文档状态**: ✅ 开发设计完成，待评审
**创建日期**: 2026-02-24
**最后更新**: 2026-02-24
