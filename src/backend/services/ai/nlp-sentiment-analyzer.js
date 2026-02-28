/**
 * 深度NLP情感分析服务
 * 使用NLP技术进行细粒度情感分析和文本挖掘
 *
 * 功能:
 * 1. 细粒度情感分析 (5级分类)
 * 2. 公告文本结构化提取
 * 3. 财报数据智能提取
 * 4. 情感趋势分析
 * 5. 关键实体识别
 * 6. 跨新闻情感关联
 */

const LLMNewsAnalyzer = require('./llm-news-analyzer');
const { Pool } = require('pg');

class NLPSentimentAnalyzer {
  constructor() {
    this.llm = LLMNewsAnalyzer;
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 情感词典 (简化版)
    this.positiveWords = new Set([
      '增长', '盈利', '突破', '创新', '合作', '增持', '回购', '分红',
      '利好', '上涨', '强势', '优秀', '领先', '超越', '提升', '改善',
      '成功', '获得', '达成', '实现', '加速', '扩张', '收购', '投资'
    ]);

    this.negativeWords = new Set([
      '下滑', '亏损', '减持', '调查', '处罚', '风险', '下跌', '跌停',
      '利空', '弱势', '低于', '放缓', '缩减', '裁员', '债务', '违约',
      '失败', '损失', '危机', '衰退', '拖累', '涉诉', '违规', '造假'
    ]);

    // 情感强度修饰词
    this.intensityModifiers = {
      '非常': 2.0,
      '极其': 2.5,
      '特别': 1.8,
      '相当': 1.5,
      '比较': 1.2,
      '略微': 0.8,
      '稍': 0.7,
      '有点': 0.6,
      '勉强': 0.5
    };

    // 领域词典
    this.domainTerms = {
      financial: ['营收', '利润', '毛利率', '净利率', 'ROE', 'EPS', '现金流', '资产负债率'],
      technical: ['突破', '支撑', '阻力', '趋势', '成交量', '换手率', '振幅'],
      policy: ['降准', '降息', '政策', '监管', '审批', '核准', '批复'],
      market: ['板块', '概念', '热点', '资金', '流入', '流出', '北向资金']
    };
  }

  /**
   * 细粒度情感分析 (5级分类)
   * @param {string} text - 待分析文本
   * @param {object} options - 选项
   */
  async analyzeFineGrainedSentiment(text, options = {}) {
    try {
      const {
        useLLM = true,
        domain = 'general'  // general, financial, technical, policy, market
      } = options;

      console.log(`\n🔬 细粒度情感分析 (领域: ${domain})`);

      // 1. 使用LLM进行深度分析
      if (useLLM && this.llm.enabled) {
        return await this.llmFineGrainedAnalysis(text, domain);
      }

      // 2. 回退到规则分析
      return await this.ruleBasedFineGrainedAnalysis(text, domain);

    } catch (error) {
      console.error(`❌ 细粒度情感分析失败: ${error.message}`);
      return this.getDefaultSentiment();
    }
  }

  /**
   * LLM细粒度分析
   */
  async llmFineGrainedAnalysis(text, domain) {
    const systemPrompt = `你是一个专业的${domain}领域情感分析师。

请对给定的文本进行细粒度情感分析，包括以下维度：

1. 情感分类 (5级):
   - 非常积极 (Very Positive, 90-100分)
   - 积极 (Positive, 70-89分)
   - 中性 (Neutral, 45-69分)
   - 消极 (Negative, 25-44分)
   - 非常消极 (Very Negative, 0-24分)

2. 情感强度 (0-100):
   - 数值越高表示情感越强烈

3. 情感分布:
   - 积极、中性、消极的百分比

4. 关键情感词:
   - 提取3-5个决定情感的关键词

5. 情感原因:
   - 解释为什么得出这个情感判断

6. 领域相关特征:
   - 识别${domain}领域的特定要素

请以JSON格式返回：
{
  "category": "very_positive|positive|neutral|negative|very_negative",
  "score": 85,
  "intensity": 75,
  "distribution": {
    "positive": 70,
    "neutral": 20,
    "negative": 10
  },
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "reason": "情感判断的原因",
  "domainFeatures": ["领域特征1", "领域特征2"]
}`;

    const userPrompt = `请分析以下文本的情感：\n\n${text}`;

    const result = await this.llm.callLLM(systemPrompt, userPrompt, 0.5);

    console.log(`✅ LLM细粒度分析: ${result.category} (${result.score}分)`);
    return result;
  }

  /**
   * 基于规则的细粒度分析
   */
  async ruleBasedFineGrainedAnalysis(text, domain) {
    console.log(`📊 使用规则进行细粒度分析`);

    // 1. 计算基础情感得分
    let positiveCount = 0;
    let negativeCount = 0;
    let positiveWeighted = 0;
    let negativeWeighted = 0;

    // 检查情感词
    for (const word of this.positiveWords) {
      if (text.includes(word)) {
        positiveCount++;
        // 检查修饰词
        const modifier = this.findIntensityModifier(text, word);
        positiveWeighted += modifier;
      }
    }

    for (const word of this.negativeWords) {
      if (text.includes(word)) {
        negativeCount++;
        const modifier = this.findIntensityModifier(text, word);
        negativeWeighted += modifier;
      }
    }

    // 2. 计算情感得分 (0-100)
    const totalWeighted = positiveWeighted + negativeWeighted;
    let baseScore = 50;

    if (totalWeighted > 0) {
      const positiveRatio = positiveWeighted / totalWeighted;
      baseScore = Math.round(positiveRatio * 100);
    }

    // 3. 调整得分 (考虑强度)
    const intensity = Math.min(100, (positiveCount + negativeCount) * 15);
    const adjustedScore = this.adjustScoreByIntensity(baseScore, intensity);

    // 4. 确定分类
    const category = this.getSentimentCategory(adjustedScore);

    // 5. 计算分布
    const distribution = {
      positive: totalWeighted > 0 ? Math.round((positiveWeighted / totalWeighted) * 100) : 50,
      neutral: totalWeighted > 0 ? Math.round((1 - (positiveWeighted + negativeWeighted) / (positiveWeighted + negativeWeighted + 1)) * 50) : 50,
      negative: totalWeighted > 0 ? Math.round((negativeWeighted / totalWeighted) * 100) : 50
    };

    // 6. 提取关键词
    const keywords = this.extractKeywords(text);

    // 7. 领域特征
    const domainFeatures = this.extractDomainFeatures(text, domain);

    const result = {
      category: category,
      score: adjustedScore,
      intensity: intensity,
      distribution: distribution,
      keywords: keywords,
      reason: this.generateSentimentReason(positiveCount, negativeCount, category),
      domainFeatures: domainFeatures
    };

    console.log(`✅ 规则细粒度分析: ${result.category} (${result.score}分)`);
    return result;
  }

  /**
   * 情感趋势分析
   * @param {array} newsList - 新闻列表
   */
  async analyzeSentimentTrend(newsList) {
    console.log(`\n📈 情感趋势分析 (${newsList.length}条新闻)`);

    if (newsList.length === 0) {
      return this.getDefaultTrend();
    }

    // 1. 分析每条新闻的情感
    const sentiments = [];
    for (const news of newsList) {
      const sentiment = await this.analyzeFineGrainedSentiment(
        news.title + ' ' + (news.description || ''),
        { useLLM: false, domain: 'general' }
      );
      sentiments.push({
        date: news.created_at,
        score: sentiment.score,
        category: sentiment.category
      });
    }

    // 2. 计算趋势
    const trend = this.calculateTrend(sentiments);

    // 3. 计算移动平均
    const movingAverage = this.calculateMovingAverage(
      sentiments.map(s => s.score),
      Math.min(5, sentiments.length)
    );

    // 4. 检测转折点
    const turningPoints = this.detectTurningPoints(sentiments);

    // 5. 趋势预测
    const forecast = this.forecastTrend(sentiments);

    const result = {
      overall: trend.overall,
      direction: trend.direction,
      change: trend.change,
      changePercent: trend.changePercent,
      volatility: this.calculateVolatility(sentiments),
      movingAverage: movingAverage,
      turningPoints: turningPoints,
      forecast: forecast,
      sentiments: sentiments
    };

    console.log(`✅ 趋势分析: ${result.direction} (${result.changePercent.toFixed(2)}%)`);
    return result;
  }

  /**
   * 公告文本结构化提取
   * @param {string} announcementText - 公告文本
   */
  async extractAnnouncement(announcementText) {
    console.log(`\n📋 公告结构化提取`);

    if (this.llm.enabled) {
      return await this.llmExtractAnnouncement(announcementText);
    }

    return await this.ruleBasedExtractAnnouncement(announcementText);
  }

  /**
   * LLM提取公告信息
   */
  async llmExtractAnnouncement(text) {
    const systemPrompt = `你是一个专业的金融公告解析助手。

请从公告文本中提取结构化信息，包括：

1. 公告类型:
   - 业绩预告/业绩快报/定期报告
   - 分红派息/回购/增持/减持
   - 重大合同/投资项目/并购重组
   - 停牌/复牌/风险提示
   - 其他

2. 关键数值:
   - 营收、利润、增长率
   - 涉及金额、比例
   - 重要时间节点

3. 影响评估:
   - 对股价的影响方向
   - 影响程度
   - 影响持续时间

4. 风险提示:
   - 潜在风险因素

5. 投资建议:
   - 基于公告的简要建议

请以JSON格式返回。`;

    const userPrompt = `请提取以下公告的信息：\n\n${text}`;

    const result = await this.llm.callLLM(systemPrompt, userPrompt, 0.5);

    console.log(`✅ LLM公告提取: ${result.announcementType}`);
    return result;
  }

  /**
   * 规则提取公告信息
   */
  async ruleBasedExtractAnnouncement(text) {
    console.log(`📊 使用规则提取公告`);

    const result = {
      announcementType: '其他',
      keyFigures: [],
      impact: {
        direction: 'neutral',
        degree: 'moderate',
        duration: 'short'
      },
      risks: [],
      suggestion: '请人工分析'
    };

    // 简单的规则匹配
    if (text.includes('业绩预告') || text.includes('业绩快报')) {
      result.announcementType = '业绩预告';
      // 提取数值
      const numbers = text.match(/(\d+\.?\d*)[%亿元万千]/g);
      if (numbers) {
        result.keyFigures = numbers.slice(0, 5);
      }
    } else if (text.includes('分红') || text.includes('派息')) {
      result.announcementType = '分红派息';
      result.impact.direction = 'positive';
    } else if (text.includes('回购') || text.includes('增持')) {
      result.announcementType = '回购增持';
      result.impact.direction = 'positive';
      result.impact.degree = 'significant';
    } else if (text.includes('减持')) {
      result.announcementType = '减持';
      result.impact.direction = 'negative';
    }

    console.log(`✅ 规则公告提取: ${result.announcementType}`);
    return result;
  }

  /**
   * 财报数据智能提取
   * @param {string} reportText - 财报文本
   */
  async extractFinancialReport(reportText) {
    console.log(`\n💰 财报数据提取`);

    if (this.llm.enabled) {
      return await this.llmExtractFinancialReport(reportText);
    }

    return await this.ruleBasedExtractFinancialReport(reportText);
  }

  /**
   * LLM提取财报数据
   */
  async llmExtractFinancialReport(text) {
    const systemPrompt = `你是一个专业的财务报告解析助手。

请从财报文本中提取关键财务数据：

1. 利润表数据:
   - 营业收入及增长率
   - 净利润及增长率
   - 毛利率、净利率

2. 资产负债表:
   - 总资产
   - 总负债
   - 资产负债率
   - 流动比率

3. 现金流量表:
   - 经营活动现金流
   - 投资活动现金流
   - 筹资活动现金流

4. 关键比率:
   - ROE
   - EPS
   - 每股净资产

5. 管理层讨论:
   - 业绩变化原因
   - 未来展望
   - 风险因素

请以JSON格式返回，数值保留2位小数。`;

    const userPrompt = `请提取以下财报的信息：\n\n${text.substring(0, 3000)}`;

    const result = await this.llm.callLLM(systemPrompt, userPrompt, 0.3);

    console.log(`✅ LLM财报提取完成`);
    return result;
  }

  /**
   * 规则提取财报数据
   */
  async ruleBasedExtractFinancialReport(text) {
    console.log(`📊 使用规则提取财报`);

    const result = {
      incomeStatement: {},
      balanceSheet: {},
      cashFlow: {},
      ratios: {},
      managementDiscussion: {
        reasons: [],
        outlook: 'neutral',
        risks: []
      }
    };

    // 提取数值
    const patterns = {
      revenue: /(?:营业收入|营收)[：:]\s*([\d,]+\.?\d*)\s*(?:元|万元|亿元)/,
      netProfit: /(?:净利润)[：:]\s*([\d,]+\.?\d*)\s*(?:元|万元|亿元)/,
      roe: /ROE[：:]\s*([\d,]+\.?\d*)\s*%/,
      eps: /EPS[：:]\s*([\d,]+\.?\d*)/
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (key === 'roe' || key === 'eps') {
          result.ratios[key] = value;
        } else if (key === 'revenue') {
          result.incomeStatement.revenue = value;
        } else if (key === 'netProfit') {
          result.incomeStatement.netProfit = value;
        }
      }
    }

    console.log(`✅ 规则财报提取完成`);
    return result;
  }

  /**
   * 关键实体识别
   * @param {string} text - 文本
   */
  async extractEntities(text) {
    console.log(`\n🏷️  实体识别`);

    // 简化的实体识别
    const entities = {
      companies: [],
      persons: [],
      locations: [],
      dates: [],
      amounts: [],
      sectors: []
    };

    // 提取公司 (简化: 全大写或"公司"结尾)
    const companyPattern = /([A-Z]{2,}|[\u4e00-\u9fa5]{2,4}公司)/g;
    const companies = text.match(companyPattern) || [];
    entities.companies = [...new Set(companies)].slice(0, 10);

    // 提取金额
    const amountPattern = /([\d,]+\.?\d*)\s*(?:元|万元|亿元|美元)/g;
    const amounts = text.match(amountPattern) || [];
    entities.amounts = amounts.slice(0, 5);

    // 提取日期
    const datePattern = /(\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2})/g;
    const dates = text.match(datePattern) || [];
    entities.dates = [...new Set(dates)];

    // 提取行业关键词
    const sectorKeywords = ['银行', '地产', '科技', '医药', '消费', '能源', '制造'];
    for (const sector of sectorKeywords) {
      if (text.includes(sector)) {
        entities.sectors.push(sector);
      }
    }

    console.log(`✅ 实体识别: 公司${entities.companies.length}个, 金额${entities.amounts.length}个`);
    return entities;
  }

  /**
   * 跨新闻情感关联分析
   * @param {array} newsList - 新闻列表
   */
  async analyzeCrossNewsSentiment(newsList) {
    console.log(`\n🔗 跨新闻情感关联分析`);

    if (newsList.length < 2) {
      return {
        correlation: 0,
        consensus: 'neutral',
        conflicting: false,
        clusters: []
      };
    }

    // 1. 分析每条新闻的情感
    const sentiments = [];
    for (const news of newsList) {
      const sentiment = await this.analyzeFineGrainedSentiment(
        news.title + ' ' + (news.description || ''),
        { useLLM: false }
      );
      sentiments.push({
        title: news.title,
        score: sentiment.score,
        category: sentiment.category
      });
    }

    // 2. 计算相关性
    const scores = sentiments.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance));

    // 3. 判断一致性
    const positiveCount = sentiments.filter(s => s.score > 60).length;
    const negativeCount = sentiments.filter(s => s.score < 40).length;
    const consensus = positiveCount > negativeCount ? 'positive' :
                     negativeCount > positiveCount ? 'negative' : 'neutral';

    // 4. 检测冲突
    const hasPositive = positiveCount > 0;
    const hasNegative = negativeCount > 0;
    const conflicting = hasPositive && hasNegative;

    // 5. 聚类分析
    const clusters = this.clusterSentiments(sentiments);

    const result = {
      consistency: consistency,
      consensus: consensus,
      conflicting: conflicting,
      positiveCount: positiveCount,
      negativeCount: negativeCount,
      neutralCount: sentiments.length - positiveCount - negativeCount,
      clusters: clusters,
      sentiments: sentiments
    };

    console.log(`✅ 关联分析: 一致性${result.consistency.toFixed(1)}%, 共识${result.consensus}`);
    return result;
  }

  // ============ 辅助方法 ============

  findIntensityModifier(text, keyword) {
    const index = text.indexOf(keyword);
    if (index === -1) return 1.0;

    // 检查前后10个字符
    const context = text.substring(Math.max(0, index - 10), index + keyword.length + 10);

    for (const [modifier, intensity] of Object.entries(this.intensityModifiers)) {
      if (context.includes(modifier)) {
        return intensity;
      }
    }

    return 1.0;
  }

  adjustScoreByIntensity(score, intensity) {
    if (intensity > 70) {
      // 高强度: 拉向极端
      return score > 50 ? Math.min(100, score + 10) : Math.max(0, score - 10);
    } else if (intensity < 30) {
      // 低强度: 拉向中性
      return score + (50 - score) * 0.3;
    }
    return score;
  }

  getSentimentCategory(score) {
    if (score >= 90) return 'very_positive';
    if (score >= 70) return 'positive';
    if (score >= 45) return 'neutral';
    if (score >= 25) return 'negative';
    return 'very_negative';
  }

  extractKeywords(text) {
    const keywords = [];
    const allWords = [...this.positiveWords, ...this.negativeWords];

    for (const word of allWords) {
      if (text.includes(word) && keywords.length < 5) {
        keywords.push(word);
      }
    }

    return keywords.length > 0 ? keywords : ['无明显关键词'];
  }

  extractDomainFeatures(text, domain) {
    const terms = this.domainTerms[domain] || [];
    const features = [];

    for (const term of terms) {
      if (text.includes(term)) {
        features.push(term);
      }
    }

    return features.length > 0 ? features : ['无特定领域特征'];
  }

  generateSentimentReason(positiveCount, negativeCount, category) {
    if (positiveCount > negativeCount * 2) {
      return `检测到${positiveCount}个正面词汇，${negativeCount}个负面词汇，整体情绪积极`;
    } else if (negativeCount > positiveCount * 2) {
      return `检测到${negativeCount}个负面词汇，${positiveCount}个正面词汇，整体情绪消极`;
    } else {
      return `正面词汇${positiveCount}个，负面词汇${negativeCount}个，情绪相对平衡`;
    }
  }

  calculateTrend(sentiments) {
    if (sentiments.length < 2) {
      return { overall: 50, direction: 'stable', change: 0, changePercent: 0 };
    }

    const firstScore = sentiments[0].score;
    const lastScore = sentiments[sentiments.length - 1].score;
    const overall = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;

    const change = lastScore - firstScore;
    const changePercent = (change / firstScore) * 100;

    let direction = 'stable';
    if (changePercent > 10) direction = 'rising';
    else if (changePercent < -10) direction = 'falling';

    return {
      overall: overall,
      direction: direction,
      change: change,
      changePercent: changePercent
    };
  }

  calculateMovingAverage(scores, window) {
    const ma = [];
    for (let i = window - 1; i < scores.length; i++) {
      const sum = scores.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      ma.push(sum / window);
    }
    return ma;
  }

  calculateVolatility(sentiments) {
    if (sentiments.length < 2) return 0;

    const scores = sentiments.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    return Math.sqrt(variance);
  }

  detectTurningPoints(sentiments) {
    const points = [];
    const scores = sentiments.map(s => s.score);

    for (let i = 1; i < scores.length - 1; i++) {
      const prev = scores[i - 1];
      const curr = scores[i];
      const next = scores[i + 1];

      // 局部极值
      if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
        points.push({
          index: i,
          date: sentiments[i].date,
          score: curr,
          type: curr > 50 ? 'peak' : 'trough'
        });
      }
    }

    return points;
  }

  forecastTrend(sentiments) {
    if (sentiments.length < 3) {
      return { direction: 'uncertain', confidence: 0 };
    }

    const scores = sentiments.map(s => s.score);
    const last3 = scores.slice(-3);

    // 简单趋势预测
    const trend = (last3[2] - last3[0]) / 2;

    let direction = 'uncertain';
    if (trend > 5) direction = 'up';
    else if (trend < -5) direction = 'down';
    else direction = 'stable';

    // 置信度基于一致性
    const consistency = 100 - this.calculateVolatility(sentiments);
    const confidence = Math.min(100, Math.max(0, consistency));

    return {
      direction: direction,
      change: trend,
      confidence: confidence
    };
  }

  clusterSentiments(sentiments) {
    const clusters = {
      positive: sentiments.filter(s => s.score > 60),
      neutral: sentiments.filter(s => s.score >= 40 && s.score <= 60),
      negative: sentiments.filter(s => s.score < 40)
    };

    return [
      { name: '积极', count: clusters.positive.length, items: clusters.positive },
      { name: '中性', count: clusters.neutral.length, items: clusters.neutral },
      { name: '消极', count: clusters.negative.length, items: clusters.negative }
    ].filter(c => c.count > 0);
  }

  getDefaultSentiment() {
    return {
      category: 'neutral',
      score: 50,
      intensity: 0,
      distribution: { positive: 50, neutral: 0, negative: 50 },
      keywords: [],
      reason: '默认中性情感',
      domainFeatures: []
    };
  }

  getDefaultTrend() {
    return {
      overall: 50,
      direction: 'stable',
      change: 0,
      changePercent: 0,
      volatility: 0,
      movingAverage: [],
      turningPoints: [],
      forecast: { direction: 'uncertain', confidence: 0 },
      sentiments: []
    };
  }
}

module.exports = new NLPSentimentAnalyzer();
