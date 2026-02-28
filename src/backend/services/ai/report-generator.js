/**
 * AI智能报告生成器
 * 自动生成专业的投资研究报告
 *
 * 功能:
 * 1. 智能摘要生成
 * 2. 多维度综合分析
 * 3. 投资建议和理由
 * 4. 风险提示
 * 5. 图表数据生成
 */

const LLMNewsAnalyzer = require('./llm-news-analyzer');

class ReportGenerator {
  constructor() {
    this.llm = LLMNewsAnalyzer;
  }

  /**
   * 生成深度研究报告
   * @param {string} stockCode - 股票代码
   * @param {object} decisionData - 决策数据
   * @param {object} options - 选项
   */
  async generateDeepReport(stockCode, decisionData, options = {}) {
    try {
      console.log(`\n📄 生成AI深度研究报告: ${stockCode}`);

      const {
        useLLM = true,
        includeCharts = true,
        language = 'zh-CN'
      } = options;

      // 1. 生成各个部分
      const report = {
        stockCode: stockCode,
        stockName: decisionData.stockName || stockCode,
        reportDate: new Date().toISOString(),
        reportType: '深度投资研究报告',

        // 2. 核心摘要
        summary: await this.generateSummary(decisionData, useLLM),

        // 3. 投资建议
        recommendation: await this.generateRecommendation(decisionData, useLLM),

        // 4. 技术面分析
        technicalAnalysis: this.analyzeTechnical(decisionData),

        // 5. 基本面分析
        fundamentalAnalysis: this.analyzeFundamental(decisionData),

        // 6. 消息面分析
        newsAnalysis: this.analyzeNews(decisionData),

        // 7. 风险评估
        riskAssessment: this.analyzeRisk(decisionData),

        // 8. AI预测
        aiForecast: this.analyzeAIForecast(decisionData),

        // 9. 关键数据
        keyData: this.extractKeyData(decisionData),

        // 10. 图表数据
        charts: includeCharts ? this.generateChartData(decisionData) : null
      };

      // 11. 生成完整报告文本
      report.fullReport = await this.generateFullReportText(report, useLLM);

      console.log(`✅ AI报告生成完成`);
      console.log(`   摘要: ${report.summary.substring(0, 50)}...`);
      console.log(`   建议: ${report.recommendation.action} (${report.recommendation.reason})`);

      return report;

    } catch (error) {
      console.error(`❌ AI报告生成失败: ${error.message}`);
      return this.getFallbackReport(stockCode);
    }
  }

  /**
   * 生成智能摘要
   */
  async generateSummary(decisionData, useLLM) {
    if (useLLM && this.llm.enabled) {
      return await this.llmGenerateSummary(decisionData);
    }

    return this.ruleBasedGenerateSummary(decisionData);
  }

  /**
   * LLM生成摘要
   */
  async llmGenerateSummary(decisionData) {
    const systemPrompt = `你是一个专业的投资研究分析师。

请根据提供的股票分析数据，生成一份简洁有力的投资摘要（100-200字）。

摘要应包括：
1. 核心观点（1句话）
2. 主要理由（2-3点）
3. 关键数据（1-2个）
4. 风险提示（1句）

风格要求：
- 客观、专业
- 突出重点
- 数据支撑
- 简洁明了`;

    const userPrompt = this.buildAnalysisContext(decisionData);

    const result = await this.llm.callLLM(systemPrompt, userPrompt, 0.7);

    return result.summary || result;
  }

  /**
   * 规则生成摘要
   */
  ruleBasedGenerateSummary(decisionData) {
    const { decision, scores, risk } = decisionData;
    const parts = [];

    // 决策观点
    const decisionMap = {
      'STRONG_BUY': '强烈推荐买入',
      'BUY': '建议买入',
      'POSITIVE_HOLD': '建议继续持有并适当加仓',
      'HOLD': '建议持有观望',
      'CAUTIOUS_HOLD': '建议谨慎持有',
      'REDUCE_HOLD': '建议减仓',
      'SELL': '建议卖出',
      'STRONG_SELL': '强烈建议卖出'
    };

    parts.push(decisionMap[decision] || decision);

    // 理由
    if (scores && scores.totalScore) {
      parts.push(`综合评分${scores.totalScore.toFixed(1)}分`);
    }

    if (decisionData.reason) {
      parts.push(decisionData.reason);
    }

    // 风险提示
    if (risk && risk.level) {
      const riskMap = {
        'LOW': '风险较低',
        'MEDIUM': '风险适中',
        'HIGH': '风险较高'
      };
      parts.push(riskMap[risk.level]);
    }

    return parts.join('。') + '。';
  }

  /**
   * 生成投资建议
   */
  async generateRecommendation(decisionData, useLLM) {
    const { decision, confidence, reason } = decisionData;

    const actionMap = {
      'STRONG_BUY': 'strong_buy',
      'BUY': 'buy',
      'POSITIVE_HOLD': 'positive_hold',
      'HOLD': 'hold',
      'CAUTIOUS_HOLD': 'cautious_hold',
      'REDUCE_HOLD': 'reduce_hold',
      'SELL': 'sell',
      'STRONG_SELL': 'strong_sell'
    };

    return {
      action: actionMap[decision] || 'hold',
      decision: decision,
      confidence: confidence || 70,
      reason: reason || '综合分析建议',
      targetPrice: this.calculateTargetPrice(decisionData),
      timeHorizon: 'medium',
      positionSize: this.suggestPositionSize(decisionData)
    };
  }

  /**
   * 技术面分析
   */
  analyzeTechnical(decisionData) {
    const scores = decisionData.scores || {};
    const technical = scores.technical || {};

    return {
      overallScore: scores.technicalScore || 0,
      grade: this.getGrade(scores.technicalScore),
      trend: this.analyzeTrend(technical),
      momentum: this.analyzeMomentum(technical),
      support: this.calculateSupport(technical),
      resistance: this.calculateResistance(technical),
      indicators: this.extractTechnicalIndicators(technical),
      analysis: this.generateTechnicalAnalysis(technical)
    };
  }

  /**
   * 基本面分析
   */
  analyzeFundamental(decisionData) {
    const fundamental = decisionData.fundamental || {};

    if (!fundamental.profitability) {
      return {
        available: false,
        message: '暂无基本面数据'
      };
    }

    return {
      available: true,
      overallScore: fundamental.overall || 0,
      grade: fundamental.grade || 'C',

      // 盈利能力
      profitability: {
        score: fundamental.profitability?.overall || 0,
        level: this.getLevel(fundamental.profitability?.overall),
        roe: fundamental.profitability?.roe || 0,
        netMargin: fundamental.profitability?.netMargin || 0
      },

      // 成长性
      growth: {
        score: fundamental.growth?.overall || 0,
        level: this.getLevel(fundamental.growth?.overall),
        revenueGrowth: fundamental.growth?.revenueGrowth || 0,
        profitGrowth: fundamental.growth?.profitGrowth || 0
      },

      // 财务健康
      financialHealth: {
        score: fundamental.financialHealth?.overall || 0,
        level: this.getLevel(fundamental.financialHealth?.overall),
        debtRatio: fundamental.financialHealth?.debtRatio || 0,
        currentRatio: fundamental.financialHealth?.currentRatio || 0
      },

      analysis: this.generateFundamentalAnalysis(fundamental)
    };
  }

  /**
   * 消息面分析
   */
  analyzeNews(decisionData) {
    const news = decisionData.news || {};
    const llmNews = decisionData.llmNewsAnalysis;

    if (llmNews && llmNews.analyses) {
      // LLM深度分析结果
      return {
        method: 'llm',
        overallScore: llmNews.overall || 0,
        sentiment: llmNews.sentiment || 50,
        impact: llmNews.impact || 50,
        credibility: llmNews.credibility || 50,
        bias: llmNews.bias || 'neutral',
        summary: llmNews.summary || '',
        keyEvents: llmNews.analyses.slice(0, 3).map(a => ({
          title: a.title,
          sentiment: a.analysis.sentiment,
          impact: a.analysis.impact,
          priceImpact: a.analysis.priceImpact
        }))
      };
    }

    // 传统分析结果
    return {
      method: 'traditional',
      overallScore: decisionData.newsScore || 50,
      grade: this.getGrade(decisionData.newsScore),
      sentiment: news.sentiment || 50,
      importance: news.importance || 50,
      eventCount: news.eventCount || 0,
      summary: news.summary || '暂无重大新闻'
    };
  }

  /**
   * 风险评估
   */
  analyzeRisk(decisionData) {
    const risk = decisionData.risk || {};

    return {
      level: risk.level || 'MEDIUM',
      score: risk.score || 50,
      factors: this.extractRiskFactors(risk),
      warning: this.generateRiskWarning(risk),
      suggestions: this.generateRiskSuggestions(risk)
    };
  }

  /**
   * AI预测分析
   */
  analyzeAIForecast(decisionData) {
    const ml = decisionData.mlPrediction;
    const dl = decisionData.deepLearningPrediction;

    const forecast = {
      available: false,
      predictions: []
    };

    // ML预测
    if (ml && ml.ensemble) {
      forecast.available = true;
      forecast.predictions.push({
        method: 'Machine Learning',
        algorithm: 'Random Forest + XGBoost',
        predictedPrice: ml.ensemble.predictedPrice,
        predictedChange: ml.ensemble.predictedChangePercent,
        direction: ml.ensemble.direction,
        confidence: ml.ensemble.confidence,
        timeframe: '1-5天'
      });
    }

    // 深度学习预测
    if (dl && dl.ensemble) {
      forecast.available = true;
      forecast.predictions.push({
        method: 'Deep Learning',
        algorithm: dl.model ? Object.keys(dl.model).join(' + ') : 'Neural Network',
        predictedPrice: dl.ensemble.predictedPrice,
        predictedChange: dl.ensemble.predictedChangePercent,
        direction: dl.ensemble.direction,
        confidence: dl.ensemble.confidence,
        timeframe: '1天'
      });
    }

    return forecast;
  }

  /**
   * 提取关键数据
   */
  extractKeyData(decisionData) {
    return {
      currentPrice: decisionData.currentPrice,
      targetPrice: this.calculateTargetPrice(decisionData),
      change: this.calculatePriceChange(decisionData),
      volume: decisionData.volume,
      turnover: decisionData.turnover,
      pe: decisionData.pe,
      pb: decisionData.pb,
      marketCap: decisionData.marketCap
    };
  }

  /**
   * 生成图表数据
   */
  generateChartData(decisionData) {
    return {
      scoreRadar: this.generateScoreRadarData(decisionData),
      trendChart: this.generateTrendChartData(decisionData),
      pieChart: this.generateDistributionData(decisionData)
    };
  }

  /**
   * 生成完整报告文本
   */
  async generateFullReportText(report, useLLM) {
    let text = '';

    // 标题
    text += `\n${'='.repeat(60)}\n`;
    text += `${report.stockName} (${report.stockCode}) - ${report.reportType}\n`;
    text += `${'='.repeat(60)}\n`;
    text += `报告日期: ${new Date(report.reportDate).toLocaleDateString('zh-CN')}\n\n`;

    // 摘要
    text += `【核心摘要】\n`;
    text += `${report.summary}\n\n`;

    // 投资建议
    text += `【投资建议】\n`;
    text += `操作: ${this.formatAction(report.recommendation.action)}\n`;
    text += `理由: ${report.recommendation.reason}\n`;
    text += `置信度: ${report.recommendation.confidence.toFixed(1)}%\n`;
    if (report.recommendation.targetPrice) {
      text += `目标价: ${report.recommendation.targetPrice.toFixed(2)}元\n`;
    }
    text += `\n`;

    // 技术面
    text += `【技术面分析】\n`;
    text += `评分: ${report.technicalAnalysis.overallScore.toFixed(1)}分 (${report.technicalAnalysis.grade})\n`;
    text += `趋势: ${report.technicalAnalysis.trend}\n`;
    text += `${report.technicalAnalysis.analysis}\n\n`;

    // 基本面
    if (report.fundamentalAnalysis.available) {
      text += `【基本面分析】\n`;
      text += `评分: ${report.fundamentalAnalysis.overallScore.toFixed(1)}分 (${report.fundamentalAnalysis.grade})\n`;
      text += `盈利能力: ${report.fundamentalAnalysis.profitability.level} (${report.fundamentalAnalysis.profitability.score.toFixed(1)}分)\n`;
      text += `成长性: ${report.fundamentalAnalysis.growth.level} (${report.fundamentalAnalysis.growth.score.toFixed(1)}分)\n`;
      text += `${report.fundamentalAnalysis.analysis}\n\n`;
    }

    // 消息面
    text += `【消息面分析】\n`;
    text += `评分: ${report.newsAnalysis.overallScore.toFixed(1)}分\n`;
    if (report.newsAnalysis.method === 'llm') {
      text += `情感: ${report.newsAnalysis.sentiment.toFixed(1)}\n`;
      text += `影响: ${report.newsAnalysis.impact.toFixed(1)}\n`;
      text += `偏向: ${report.newsAnalysis.bias}\n`;
    }
    text += `${report.newsAnalysis.summary}\n\n`;

    // 风险评估
    text += `【风险评估】\n`;
    text += `风险等级: ${this.formatRiskLevel(report.riskAssessment.level)}\n`;
    text += `风险评分: ${report.riskAssessment.score.toFixed(1)}\n`;
    text += `${report.riskAssessment.warning}\n\n`;

    // AI预测
    if (report.aiForecast.available) {
      text += `【AI预测】\n`;
      report.aiForecast.predictions.forEach(pred => {
        text += `${pred.method} (${pred.algorithm}):\n`;
        text += `  预测涨跌: ${pred.predictedChange > 0 ? '+' : ''}${pred.predictedChange.toFixed(2)}%\n`;
        text += `  方向: ${pred.direction}\n`;
        text += `  置信度: ${pred.confidence.toFixed(1)}%\n`;
      });
      text += `\n`;
    }

    // 免责声明
    text += `【免责声明】\n`;
    text += `本报告由AI系统自动生成，仅供参考，不构成投资建议。\n`;
    text += `投资有风险，入市需谨慎。\n`;
    text += `${'='.repeat(60)}\n`;

    return text;
  }

  // ============ 辅助方法 ============

  buildAnalysisContext(decisionData) {
    let context = `股票代码: ${decisionData.stockCode}\n`;
    context += `决策: ${decisionData.decision}\n`;
    context += `综合评分: ${decisionData.scores?.totalScore || 'N/A'}\n`;
    context += `理由: ${decisionData.reason || 'N/A'}\n`;
    return context;
  }

  calculateTargetPrice(decisionData) {
    const currentPrice = decisionData.currentPrice || 10;
    const change = decisionData.predictedChange || 0;
    return currentPrice * (1 + change / 100);
  }

  calculatePriceChange(decisionData) {
    const current = decisionData.currentPrice || 0;
    const previous = decisionData.previousClose || current;
    return ((current - previous) / previous * 100).toFixed(2);
  }

  suggestPositionSize(decisionData) {
    const confidence = decisionData.confidence || 50;
    if (confidence >= 80) return 'full';
    if (confidence >= 60) return 'large';
    if (confidence >= 40) return 'medium';
    return 'small';
  }

  analyzeTrend(technical) {
    if (!technical) return '未知';
    const score = technical.overallScore || 50;
    if (score >= 70) return '上升趋势';
    if (score <= 30) return '下降趋势';
    return '震荡整理';
  }

  analyzeMomentum(technical) {
    if (!technical) return '中性';
    const momentum = technical.momentum || 0;
    if (momentum > 5) return '强势';
    if (momentum < -5) return '弱势';
    return '中性';
  }

  calculateSupport(technical) {
    return technical.support || '暂无';
  }

  calculateResistance(technical) {
    return technical.resistance || '暂无';
  }

  extractTechnicalIndicators(technical) {
    return technical.indicators || {};
  }

  generateTechnicalAnalysis(technical) {
    if (!technical) return '暂无技术面数据';
    const parts = [];
    if (technical.trend) parts.push(`趋势${technical.trend}`);
    if (technical.momentum) parts.push(`动量${technical.momentum}`);
    return parts.join('，') || '技术面一般';
  }

  getLevel(score) {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '较差';
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  }

  generateFundamentalAnalysis(fundamental) {
    const parts = [];

    if (fundamental.profitability?.overall >= 70) {
      parts.push('盈利能力强');
    } else if (fundamental.profitability?.overall <= 40) {
      parts.push('盈利能力弱');
    }

    if (fundamental.growth?.overall >= 70) {
      parts.push('成长性好');
    } else if (fundamental.growth?.overall <= 40) {
      parts.push('成长性不足');
    }

    if (fundamental.financialHealth?.overall >= 70) {
      parts.push('财务健康');
    } else if (fundamental.financialHealth?.overall <= 40) {
      parts.push('财务风险较高');
    }

    return parts.join('，') || '基本面表现一般';
  }

  extractRiskFactors(risk) {
    return risk.factors || ['市场波动', '政策变化'];
  }

  generateRiskWarning(risk) {
    const level = risk.level || 'MEDIUM';
    const warnings = {
      'LOW': '整体风险较低，但需关注市场变化',
      'MEDIUM': '风险适中，建议控制仓位',
      'HIGH': '风险较高，建议谨慎操作'
    };
    return warnings[level] || '请关注风险因素';
  }

  generateRiskSuggestions(risk) {
    return [
      '建议设置止损位',
      '控制仓位大小',
      '分散投资风险'
    ];
  }

  generateScoreRadarData(decisionData) {
    return {
      technical: decisionData.scores?.technicalScore || 50,
      fundamental: decisionData.fundamental?.overall || 50,
      news: decisionData.newsScore || 50,
      risk: 100 - (decisionData.risk?.score || 50)
    };
  }

  generateTrendChartData(decisionData) {
    // 简化的趋势数据
    return {
      dates: ['T-30', 'T-25', 'T-20', 'T-15', 'T-10', 'T-5', 'Today'],
      prices: [10, 11, 10.5, 12, 11.5, 12.5, decisionData.currentPrice || 12]
    };
  }

  generateDistributionData(decisionData) {
    return {
      positive: 40,
      neutral: 35,
      negative: 25
    };
  }

  formatAction(action) {
    const map = {
      'strong_buy': '强烈买入',
      'buy': '买入',
      'positive_hold': '继续持有并适当加仓',
      'hold': '持有观望',
      'cautious_hold': '谨慎持有',
      'reduce_hold': '减仓',
      'sell': '卖出',
      'strong_sell': '强烈卖出'
    };
    return map[action] || action;
  }

  formatRiskLevel(level) {
    const map = {
      'LOW': '低',
      'MEDIUM': '中',
      'HIGH': '高'
    };
    return map[level] || level;
  }

  getFallbackReport(stockCode) {
    return {
      stockCode: stockCode,
      summary: '暂无详细分析数据',
      recommendation: {
        action: 'hold',
        reason: '数据不足，建议观望'
      },
      warning: 'AI报告生成失败'
    };
  }
}

module.exports = new ReportGenerator();
