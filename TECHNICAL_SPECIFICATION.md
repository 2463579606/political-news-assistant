# 技术实现规格说明书

**项目**: AI智能投资决策助手 v2.0
**日期**: 2026-02-24
**状态**: 设计阶段

---

## 1. 核心功能模块详细设计

### 1.1 新闻分析引擎 (News Analysis Engine)

#### 1.1.1 事件提取器 (Event Extractor)

**输入**: 新闻文本
**输出**: 结构化事件对象

```typescript
interface NewsEvent {
  // 基础信息
  id: string;
  newsId: string;
  title: string;
  content: string;

  // 事件分类
  eventType: 'policy' | 'meeting' | 'macro_data' | 'emergency' | 'market';
  eventCategory: string; // 具体分类，如"降准"/"美联储议息"/"GDP数据"

  // 重要性评分
  importanceScore: number; // 1-10分
  importanceReason: string; // 评分理由

  // 情感分析
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1到1
  sentimentReason: string;

  // 影响分析
  impactDuration: 'short' | 'medium' | 'long'; // 短期<1周/中期1-3月/长期>3月
  impactStrength: 'weak' | 'moderate' | 'strong'; // 弱/中/强
  impactSectors: string[]; // 受影响的板块
  impactStocks: string[]; // 直接受影响的股票

  // 实体识别
  entities: {
    organizations: string[]; // 机构名称
    persons: string[]; // 人物名称
    locations: string[]; // 地点
    numbers: number[]; // 数据
  };

  // 时间信息
  eventTime: Date;
  publishTime: Date;
  effectiveTime?: Date; // 生效时间

  // 元数据
  confidence: number; // 提取置信度 0-1
  extractedAt: Date;
}
```

**实现方案**:

```javascript
class EventExtractor {
  constructor() {
    this.llm = new Anthropic(); // Claude API
    this.classifier = new FinBERT(); // 金融分类模型
  }

  async extract(newsItem) {
    // Step 1: 使用LLM提取事件
    const prompt = `
请从以下新闻中提取关键事件信息：

标题：${newsItem.title}
内容：${newsItem.content}

请识别：
1. 事件类型（政策/会议/宏观数据/突发事件/市场）
2. 重要性评分（1-10分，考虑来源权威性、影响范围）
3. 情感倾向（正面/负面/中性，及强度）
4. 影响持续时间（短期/中期/长期）
5. 受影响的板块和股票
6. 关键实体（机构/人物/地点/数据）

以JSON格式返回。
`;

    const llmResult = await this.llm.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const eventData = JSON.parse(llmResult.content[0].text);

    // Step 2: 使用FinBERT进行情感分析验证
    const sentimentResult = await this.classifier.predict(newsItem.content);

    // Step 3: 合并结果
    return {
      ...eventData,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      confidence: this.calculateConfidence(eventData, sentimentResult)
    };
  }

  calculateConfidence(llmData, sentimentData) {
    // 基于多个因素计算置信度
    const factors = [
      llmData.confidence || 0.8,
      sentimentData.confidence || 0.8,
      this.hasSpecificNumbers(newsItem.content) ? 0.9 : 0.7,
      this.isFromAuthoritativeSource(newsItem.source) ? 0.9 : 0.6
    ];

    return factors.reduce((a, b) => a * b, 1);
  }
}
```

#### 1.1.2 板块映射器 (Sector Mapper)

**功能**: 将新闻内容映射到受影响的板块和股票

```typescript
interface SectorMapping {
  sectors: {
    code: string;      // 板块代码，如"BK0001"
    name: string;      // 板块名称，如"银行"
    impactScore: number; // 影响评分 -5到+5
    impactReason: string;  // 影响原因
    stocks: {
      code: string;    // 股票代码
      name: string;    // 股票名称
      impactScore: number; // 该股票的影响评分
      reason: string;  // 影响该股票的具体原因
    }[];
  }[];
}
```

**实现方案**:

```javascript
class SectorMapper {
  constructor() {
    // 板块关键词映射表
    this.sectorKeywords = this.loadSectorKeywords();
    // 股票-板块映射表
    this.stockSectorMap = this.loadStockSectorMap();
    // 政策-板块映射规则
    this.policyRules = this.loadPolicyRules();
  }

  async map(newsEvent) {
    const results = [];

    // 方法1: 基于关键词匹配
    const keywordMatches = this.matchByKeywords(newsEvent);
    results.push(...keywordMatches);

    // 方法2: 基于规则引擎
    if (newsEvent.eventType === 'policy') {
      const policyMatches = this.matchByPolicyRules(newsEvent);
      results.push(...policyMatches);
    }

    // 方法3: 基于实体识别
    if (newsEvent.entities.organizations.length > 0) {
      const entityMatches = this.matchByEntities(newsEvent);
      results.push(...entityMatches);
    }

    // 合并和去重
    return this.aggregateResults(results);
  }

  matchByKeywords(newsEvent) {
    const text = `${newsEvent.title} ${newsEvent.content}`;
    const matches = [];

    for (const [sectorCode, sector] of Object.entries(this.sectorKeywords)) {
      let score = 0;
      const matchedKeywords = [];

      // 计算关键词匹配分数
      for (const keyword of sector.keywords) {
        if (text.includes(keyword)) {
          score += sector.weights[keyword] || 1;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        // 调整分数基于新闻情感
        const adjustedScore = newsEvent.sentiment === 'positive' ? score :
                            newsEvent.sentiment === 'negative' ? -score : score * 0.5;

        // 提取该板块的成分股
        const stocks = this.getStocksInSector(sectorCode, adjustedScore);

        matches.push({
          code: sectorCode,
          name: sector.name,
          impactScore: Math.min(5, Math.max(-5, adjustedScore)),
          impactReason: `关键词匹配: ${matchedKeywords.join(', ')}`,
          stocks: stocks.slice(0, 10) // 取前10个最相关的股票
        });
      }
    }

    return matches;
  }

  matchByPolicyRules(newsEvent) {
    const rules = this.policyRules.filter(r =>
      newsEvent.eventCategory.includes(r.trigger)
    );

    return rules.map(rule => ({
      code: rule.sectorCode,
      name: rule.sectorName,
      impactScore: rule.baseImpact * (newsEvent.sentiment === 'positive' ? 1 : -1),
      impactReason: `政策影响: ${rule.reason}`,
      stocks: this.getStocksInSector(rule.sectorCode, rule.baseImpact)
    }));
  }

  getStocksInSector(sectorCode, sectorImpact) {
    const stocks = this.stockSectorMap[sectorCode] || [];

    return stocks.map(stock => ({
      code: stock.code,
      name: stock.name,
      impactScore: sectorImpact * stock.weight, // 权重基于市值等
      reason: `属于${sectorCode}板块`
    }));
  }
}
```

#### 1.1.3 相似事件检索器 (Similar Event Retriever)

**功能**: 检索历史相似事件，用于对比分析

```typescript
interface SimilarEvent {
  originalEvent: NewsEvent;
  historicalEvent: NewsEvent;
  similarity: number; // 相似度 0-1
  marketImpact: {
    date: Date;
    sectorPerformance: {
      sector: string;
      change: number; // 涨跌幅
    }[];
    stockPerformance: {
      code: string;
      change: number;
    }[];
  };
  lessons: string; // 经验总结
}
```

**实现方案**:

```javascript
class SimilarEventRetriever {
  constructor(vectorDB) {
    this.vectorDB = vectorDB; // ChromaDB
    this.embedder = new OpenAIEmbeddings(); // 或其他embedding模型
  }

  async retrieve(newsEvent, topK = 5) {
    // Step 1: 将事件向量化
    const queryText = this.createQueryString(newsEvent);
    const queryEmbedding = await this.embedder.embed(queryText);

    // Step 2: 向量检索
    const results = await this.vectorDB.query({
      vector: queryEmbedding,
      topK: topK * 2, // 多取一些，再筛选
      filter: {
        eventType: newsEvent.eventType,
        timeRange: 'last-5-years' // 只检索最近5年的事件
      }
    });

    // Step 3: 精细化过滤和排序
    const filtered = results.filter(r =>
      r.similarity > 0.7 && // 相似度阈值
      this.isRelevant(r.metadata, newsEvent)
    );

    // Step 4: 获取市场影响数据
    const enriched = await Promise.all(
      filtered.slice(0, topK).map(async (result) => {
        const marketImpact = await this.getMarketImpact(result.metadata);
        const lessons = await this.generateLessons(newsEvent, result.metadata, marketImpact);

        return {
          originalEvent: newsEvent,
          historicalEvent: result.metadata,
          similarity: result.similarity,
          marketImpact,
          lessons
        };
      })
    );

    return enriched;
  }

  createQueryString(event) {
    return `
事件类型: ${event.eventType}
事件分类: ${event.eventCategory}
重要性: ${event.importanceScore}
情感: ${event.sentiment}
标题: ${event.title}
关键实体: ${event.entities.organizations.join(', ')}
    `.trim();
  }

  async getMarketImpact(historicalEvent) {
    // 从数据库查询该事件后的市场表现
    const eventDate = historicalEvent.eventTime;
    const next3Days = this.getDateRange(eventDate, 3);
    const next7Days = this.getDateRange(eventDate, 7);
    const next30Days = this.getDateRange(eventDate, 30);

    // 获取相关板块和股票的表现
    const sectorPerformance = await this.getSectorPerformance(
      historicalEvent.impactSectors,
      next3Days,
      next7Days,
      next30Days
    );

    const stockPerformance = await this.getStockPerformance(
      historicalEvent.impactStocks,
      next3Days,
      next7Days,
      next30Days
    );

    return {
      date: eventDate,
      sectorPerformance,
      stockPerformance
    };
  }

  async generateLessons(currentEvent, historicalEvent, marketImpact) {
    const prompt = `
当前事件: ${currentEvent.title}
历史相似事件: ${historicalEvent.title}
相似度: ${historicalEvent.similarity}

历史事件后的市场表现:
${JSON.stringify(marketImpact, null, 2)}

请分析历史事件的经验教训，以及对当前事件的启示。
以JSON格式返回: {lessons: string[], confidence: number}
`;

    const response = await this.llm.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }]
    });

    return JSON.parse(response.content[0].text);
  }
}
```

---

### 1.2 市场分析引擎 (Market Analysis Engine)

#### 1.2.1 技术分析器 (Technical Analyzer)

```javascript
class TechnicalAnalyzer {
  constructor() {
    this.talib = require('ta-lib');
  }

  async analyze(stockCode, period = 'daily') {
    // 获取历史行情数据
    const priceData = await this.getPriceData(stockCode, 200); // 200个交易日

    const analysis = {
      trend: this.analyzeTrend(priceData),
      indicators: this.calculateIndicators(priceData),
      signals: this.generateSignals(priceData),
      supportResistance: this.calculateSupportResistance(priceData),
      recommendation: this.generateRecommendation(priceData)
    };

    return analysis;
  }

  analyzeTrend(priceData) {
    const closes = priceData.map(d => d.close);
    const ma20 = this.talib.MA(closes, 20);
    const ma60 = this.talib.MA(closes, 60);

    const lastPrice = closes[closes.length - 1];
    const lastMA20 = ma20[ma20.length - 1];
    const lastMA60 = ma60[ma60.length - 1];

    let trend = 'neutral';
    if (lastPrice > lastMA20 && lastMA20 > lastMA60) {
      trend = 'uptrend';
    } else if (lastPrice < lastMA20 && lastMA20 < lastMA60) {
      trend = 'downtrend';
    }

    return {
      direction: trend,
      strength: this.calculateTrendStrength(closes, ma20, ma60)
    };
  }

  calculateIndicators(priceData) {
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const volumes = priceData.map(d => d.volume);

    return {
      MACD: this.talib.MACD(closes),
      RSI: this.talib.RSI(closes),
      KDJ: this.talib.STOCH(highs, lows, closes),
      BOLL: this.talib.BBANDS(closes),
      OBV: this.talib.OBV(closes, volumes)
    };
  }

  generateSignals(priceData) {
    const signals = [];
    const indicators = this.calculateIndicators(priceData);

    // MACD金叉/死叉
    if (this.isGoldenCross(indicators.MACD)) {
      signals.push({ type: 'buy', indicator: 'MACD', strength: 'strong' });
    } else if (this.isDeathCross(indicators.MACD)) {
      signals.push({ type: 'sell', indicator: 'MACD', strength: 'strong' });
    }

    // RSI超买/超卖
    const rsi = indicators.RSI[indicators.RSI.length - 1];
    if (rsi < 30) {
      signals.push({ type: 'buy', indicator: 'RSI', strength: 'moderate', value: rsi });
    } else if (rsi > 70) {
      signals.push({ type: 'sell', indicator: 'RSI', strength: 'moderate', value: rsi });
    }

    // KDJ
    const kdj = indicators.KDJ;
    const k = kdj.k[kdj.k.length - 1];
    const d = kdj.d[kdj.d.length - 1];

    if (k < 20 && d < 20 && k > d) {
      signals.push({ type: 'buy', indicator: 'KDJ', strength: 'strong' });
    } else if (k > 80 && d > 80 && k < d) {
      signals.push({ type: 'sell', indicator: 'KDJ', strength: 'strong' });
    }

    return signals;
  }

  calculateSupportResistance(priceData) {
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);

    // 使用pivot points计算支撑压力位
    const pivot = this.calculatePivotPoint(priceData);
    const resistance1 = 2 * pivot - Math.min(...lows);
    const support1 = 2 * pivot - Math.max(...highs);
    const resistance2 = pivot + (resistance1 - support1);
    const support2 = pivot - (resistance1 - support1);

    return {
      pivot,
      resistance: [resistance1, resistance2],
      support: [support1, support2]
    };
  }

  generateRecommendation(priceData) {
    const trend = this.analyzeTrend(priceData);
    const signals = this.generateSignals(priceData);
    const indicators = this.calculateIndicators(priceData);

    // 综合评分算法
    let score = 50; // 基准分

    // 趋势得分
    if (trend.direction === 'uptrend') score += 20;
    else if (trend.direction === 'downtrend') score -= 20;

    // 信号得分
    signals.forEach(signal => {
      if (signal.type === 'buy') {
        score += signal.strength === 'strong' ? 10 : 5;
      } else {
        score -= signal.strength === 'strong' ? 10 : 5;
      }
    });

    // 归一化到0-100
    score = Math.max(0, Math.min(100, score));

    let action = 'hold';
    if (score >= 70) action = 'buy';
    else if (score <= 30) action = 'sell';

    return {
      action,
      score,
      confidence: this.calculateConfidence(trend, signals)
    };
  }
}
```

#### 1.2.2 资金分析器 (FundFlowAnalyzer)

```javascript
class FundFlowAnalyzer {
  async analyze(stockCode) {
    const data = await this.getFundFlowData(stockCode, 30); // 30天数据

    return {
      mainFlow: this.analyzeMainFundFlow(data),
      northboundFlow: this.analyzeNorthboundFlow(data),
      institutionRating: this.analyzeInstitutionRating(stockCode),
      retailSentiment: this.analyzeRetailSentiment(data),
      summary: this.generateSummary(data)
    };
  }

  analyzeMainFundFlow(data) {
    // 主力资金流向分析
    const dailyFlows = data.map(d => d.mainFundFlow);
    const totalFlow = dailyFlows.reduce((a, b) => a + b, 0);
    const avgFlow = totalFlow / dailyFlows.length;
    const consecutiveInflow = this.countConsecutive(dailyFlows, 'positive');
    const consecutiveOutflow = this.countConsecutive(dailyFlows, 'negative');

    return {
      total: totalFlow,
      average: avgFlow,
      trend: this.calculateTrend(dailyFlows),
      consecutiveInflow,
      consecutiveOutflow,
      signal: this.generateSignal(totalFlow, consecutiveInflow, consecutiveOutflow)
    };
  }

  analyzeNorthboundFlow(data) {
    // 北向资金分析
    const northboundData = data.filter(d => d.northboundFlow !== null);
    const recentFlow = northboundData.slice(-5).reduce((a, b) => a + b.northboundFlow, 0);

    return {
      recent5Days: recentFlow,
      trend: this.calculateTrend(northboundData.map(d => d.northboundFlow)),
      holdingChange: await this.getNorthboundHoldingChange(stockCode)
    };
  }

  generateSignal(totalFlow, consecutiveInflow, consecutiveOutflow) {
    if (consecutiveInflow >= 5 && totalFlow > 0) {
      return { type: 'strong_buy', reason: '主力资金连续5日净流入' };
    } else if (consecutiveInflow >= 3 && totalFlow > 0) {
      return { type: 'buy', reason: '主力资金持续流入' };
    } else if (consecutiveOutflow >= 5 && totalFlow < 0) {
      return { type: 'strong_sell', reason: '主力资金连续5日净流出' };
    } else if (consecutiveOutflow >= 3 && totalFlow < 0) {
      return { type: 'sell', reason: '主力资金持续流出' };
    } else {
      return { type: 'neutral', reason: '资金流向无明显信号' };
    }
  }
}
```

#### 1.2.3 板块分析器 (SectorAnalyzer)

```javascript
class SectorAnalyzer {
  async analyze(sectorCode) {
    const [stocks, sectorIndex, flowData] = await Promise.all([
      this.getSectorStocks(sectorCode),
      this.getSectorIndex(sectorCode),
      this.getSectorFlowData(sectorCode)
    ]);

    return {
      performance: this.analyzePerformance(stocks, sectorIndex),
      rotation: this.detectRotation(sectorCode, sectorIndex),
      strength: this.calculateStrength(stocks),
      flow: this.analyzeSectorFlow(flowData),
      recommendation: this.generateRecommendation(stocks, sectorIndex, flowData)
    };
  }

  detectRotation(sectorCode, sectorIndex) {
    // 检测板块轮动
    const allSectors = await this.getAllSectorIndices();
    const rankings = this.rankSectorsByPerformance(allSectors);

    const currentRank = rankings.find(r => r.code === sectorCode).rank;
    const previousRank = this.getPreviousRank(sectorCode, 7); // 7天前的排名

    let rotationSignal = 'neutral';
    let reason = '';

    if (previousRank - currentRank >= 5) {
      rotationSignal = 'hot';
      reason = `板块排名从${previousRank}上升到${currentRank}，热度上升`;
    } else if (currentRank - previousRank >= 5) {
      rotationSignal = 'cold';
      reason = `板块排名从${previousRank}下降到${currentRank}，热度下降`;
    }

    return {
      signal: rotationSignal,
      currentRank,
      previousRank,
      rankChange: previousRank - currentRank,
      reason
    };
  }
}
```

---

### 1.3 决策引擎 (Decision Engine)

#### 1.3.1 综合评分系统

```javascript
class ComprehensiveScorer {
  constructor() {
    this.weights = {
      news: 0.30,      // 新闻面 30%
      technical: 0.30, // 技术面 30%
      fund: 0.20,      // 资金面 20%
      sector: 0.20     // 板块面 20%
    };
  }

  async calculateScore(stockCode, newsEvents) {
    const scores = {
      news: await this.scoreNews(stockCode, newsEvents),
      technical: await this.scoreTechnical(stockCode),
      fund: await this.scoreFund(stockCode),
      sector: await this.scoreSector(stockCode)
    };

    const totalScore =
      scores.news.score * this.weights.news +
      scores.technical.score * this.weights.technical +
      scores.fund.score * this.weights.fund +
      scores.sector.score * this.weights.sector;

    return {
      totalScore: Math.round(totalScore),
      breakdown: scores,
      confidence: this.calculateConfidence(scores),
      recommendation: this.generateRecommendation(totalScore, scores)
    };
  }

  async scoreNews(stockCode, newsEvents) {
    // 找出与该股票相关的新闻
    const relevantNews = newsEvents.filter(n =>
      n.impactStocks.some(s => s.code === stockCode)
    );

    if (relevantNews.length === 0) {
      return { score: 50, details: '无相关新闻', confidence: 0.3 };
    }

    let totalScore = 50; // 基准分
    const details = [];

    for (const news of relevantNews) {
      const impact = news.impactStocks.find(s => s.code === stockCode);
      const scoreChange = impact.impactScore * 10; // 影响分数转scale

      totalScore += scoreChange;
      details.push(`${news.title}: ${scoreChange > 0 ? '+' : ''}${scoreChange}`);
    }

    // 归一化到0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    return {
      score: totalScore,
      details: details.join('; '),
      confidence: Math.min(1, relevantNews.length * 0.3),
      newsCount: relevantNews.length
    };
  }

  async scoreTechnical(stockCode) {
    const technical = await new TechnicalAnalyzer().analyze(stockCode);
    return {
      score: technical.recommendation.score,
      details: `${technical.recommendation.action} (RSI: ${technical.indicators.RSI.slice(-1)[0].toFixed(2)})`,
      confidence: technical.recommendation.confidence,
      trend: technical.trend.direction
    };
  }

  async scoreFund(stockCode) {
    const fund = await new FundFlowAnalyzer().analyze(stockCode);
    let score = 50;

    if (fund.mainFlow.signal.type === 'strong_buy') score += 30;
    else if (fund.mainFlow.signal.type === 'buy') score += 15;
    else if (fund.mainFlow.signal.type === 'strong_sell') score -= 30;
    else if (fund.mainFlow.signal.type === 'sell') score -= 15;

    return {
      score: Math.max(0, Math.min(100, score)),
      details: fund.mainFlow.signal.reason,
      confidence: 0.7
    };
  }

  generateRecommendation(totalScore, breakdown) {
    let action = 'hold';
    let reasons = [];

    if (totalScore >= 75) {
      action = 'strong_buy';
      reasons = this.generateBuyReasons(breakdown);
    } else if (totalScore >= 60) {
      action = 'buy';
      reasons = this.generateBuyReasons(breakdown);
    } else if (totalScore <= 25) {
      action = 'strong_sell';
      reasons = this.generateSellReasons(breakdown);
    } else if (totalScore <= 40) {
      action = 'sell';
      reasons = this.generateSellReasons(breakdown);
    } else {
      reasons = ['综合评分处于中性区间，建议观望'];
    }

    return {
      action,
      score: totalScore,
      reasons,
      riskLevel: this.calculateRiskLevel(breakdown)
    };
  }
}
```

#### 1.3.2 决策生成器

```javascript
class DecisionGenerator {
  async generate(stockCode, analysisResults) {
    const { scores, newsEvents, technical, fund, sector } = analysisResults;

    const decision = {
      stockCode,
      stockName: await this.getStockName(stockCode),

      // 核心决策
      recommendation: scores.recommendation.action,
      confidence: scores.confidence,
      totalScore: scores.totalScore,

      // 目标价位
      priceTargets: this.calculatePriceTargets(stockCode, technical),

      // 时间周期
      holdingPeriod: this.estimateHoldingPeriod(newsEvents, sector),

      // 仓位建议
      positionSize: this.recommendPositionSize(scores, fund),

      // 核心逻辑
      rationale: this.generateRationale(scores, newsEvents, technical, fund, sector),

      // 风险提示
      risks: this.identifyRisks(newsEvents, technical, fund),

      // 止损止盈
      stopLoss: this.calculateStopLoss(stockCode, technical),
      takeProfit: this.calculateTakeProfit(stockCode, technical),

      // 历史验证
      historicalValidation: await this.getHistoricalValidation(stockCode, newsEvents),

      // 元数据
      generatedAt: new Date(),
      validUntil: this.calculateValidUntil(newsEvents)
    };

    return decision;
  }

  generateRationale(scores, newsEvents, technical, fund, sector) {
    const rationale = [];

    // 新闻面逻辑
    if (scores.breakdown.news.score > 60) {
      const topNews = newsEvents.slice(0, 3);
      rationale.push(`① ${topNews[0].summary}`);
    }

    // 技术面逻辑
    if (scores.breakdown.technical.trend === 'uptrend') {
      rationale.push(`② 技术面突破：${technical.indicators.MACD.slice(-1)[0] > 0 ? 'MACD金叉' : '突破60日均线'}`);
    }

    // 资金面逻辑
    if (fund.mainFlow.consecutiveInflow >= 3) {
      rationale.push(`③ 资金面配合：主力资金连续${fund.mainFlow.consecutiveInflow}日净流入`);
    }

    // 板块面逻辑
    if (sector.rotation.signal === 'hot') {
      rationale.push(`④ 板块轮动：${sector.rotation.reason}`);
    }

    return rationale;
  }

  calculatePriceTargets(stockCode, technical) {
    const currentPrice = await this.getCurrentPrice(stockCode);
    const { support, resistance } = technical.supportResistance;

    const targets = {
      firstTarget: resistance[0],
      secondTarget: resistance[1],
      timeFrame: '1-3个月'
    };

    return targets;
  }
}
```

---

## 2. 数据库设计

### 2.1 核心表结构

```sql
-- 新闻事件表
CREATE TABLE news_events (
  id UUID PRIMARY KEY,
  news_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50),
  event_category VARCHAR(100),
  importance_score INTEGER,
  sentiment VARCHAR(20),
  sentiment_score DECIMAL(5,4),
  impact_duration VARCHAR(20),
  impact_strength VARCHAR(20),
  impact_sectors JSONB,
  impact_stocks JSONB,
  entities JSONB,
  confidence DECIMAL(4,3),
  extracted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 决策记录表
CREATE TABLE decisions (
  id UUID PRIMARY KEY,
  stock_code VARCHAR(10) NOT NULL,
  stock_name VARCHAR(100),
  recommendation VARCHAR(20),
  confidence DECIMAL(4,3),
  total_score INTEGER,
  price_targets JSONB,
  holding_period VARCHAR(50),
  position_size VARCHAR(20),
  rationale JSONB,
  risks JSONB,
  stop_loss DECIMAL(10,2),
  take_profit DECIMAL(10,2),
  generated_at TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 决策验证表
CREATE TABLE decision_validations (
  id UUID PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id),
  actual_price DECIMAL(10,2),
  target_achieved BOOLEAN,
  direction_correct BOOLEAN,
  timeframe_correct BOOLEAN,
  profit_loss_pct DECIMAL(8,4),
  validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 相似事件表
CREATE TABLE similar_events (
  id UUID PRIMARY KEY,
  current_event_id UUID REFERENCES news_events(id),
  historical_event_id UUID REFERENCES news_events(id),
  similarity DECIMAL(4,3),
  market_impact JSONB,
  lessons TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. API设计

### 3.1 核心API端点

```yaml
# 决策相关API
POST /api/v2/decision/analyze
  - 请求: { stockCode: string, includeNews?: boolean }
  - 响应: Decision

GET /api/v2/decision/stock/:code
  - 响应: Decision

GET /api/v2/decision/history
  - 响应: Decision[]

POST /api/v2/decision/validate
  - 请求: { decisionId: string, actualPrice: number }
  - 响应: ValidationResult

# 分析相关API
GET /api/v2/analysis/stock/:code
  - 响应: { technical: TechnicalAnalysis, fund: FundAnalysis, sector: SectorAnalysis }

GET /api/v2/analysis/news/:eventId
  - 响应: NewsEvent

GET /api/v2/analysis/similar/:eventId
  - 响应: SimilarEvent[]

# 评分相关API
GET /api/v2/score/stock/:code
  - 响应: ComprehensiveScore

# 统计相关API
GET /api/v2/stats/accuracy
  - 响应: { overall: number, byType: {...}, byTimeframe: {...} }

GET /api/v2/stats/performance
  - 响应: { totalDecisions: number, profitable: number, profitRate: number }
```

---

## 4. 前端组件设计

### 4.1 核心组件

```typescript
// DecisionCard.tsx
interface DecisionCardProps {
  decision: Decision;
  showDetails?: boolean;
}

// ScoreGauge.tsx
interface ScoreGaugeProps {
  score: number;
  breakdown: ScoreBreakdown;
}

// SignalBadge.tsx
interface SignalBadgeProps {
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  confidence: number;
}

// TargetPrice.tsx
interface TargetPriceProps {
  currentPrice: number;
  targets: PriceTargets;
  stopLoss: number;
}
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-24
**状态**: 待评审
