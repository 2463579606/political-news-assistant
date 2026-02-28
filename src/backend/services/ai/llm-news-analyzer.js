/**
 * LLM新闻分析服务
 * 使用大语言模型进行深度新闻分析和影响评估
 *
 * 功能:
 * 1. 新闻情感分析 (正面/负面/中性)
 * 2. 关键信息提取
 * 3. 对股价影响评估
 * 4. 新闻可信度评分
 * 5. 关联事件挖掘
 */

const axios = require('axios');

class LLMNewsAnalyzer {
  constructor() {
    this.enabled = process.env.LLM_API_KEY && process.env.LLM_API_KEY !== '';
    this.provider = process.env.LLM_PROVIDER || 'openai'; // openai, anthropic, zhipu, local
    this.apiKey = process.env.LLM_API_KEY;
    this.baseUrl = this.getBaseUrl();
    this.model = process.env.LLM_MODEL || this.getDefaultModel();
  }

  /**
   * 获取API基础URL
   */
  getBaseUrl() {
    switch (this.provider) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v4';
      case 'local':
        return process.env.LLM_LOCAL_URL || 'http://localhost:11434';
      default:
        return 'https://api.openai.com/v1';
    }
  }

  /**
   * 获取默认模型
   */
  getDefaultModel() {
    switch (this.provider) {
      case 'openai':
        return 'gpt-4o';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'zhipu':
        return 'glm-4';
      case 'local':
        return 'llama2';
      default:
        return 'gpt-4o';
    }
  }

  /**
   * 调用LLM API
   */
  async callLLM(systemPrompt, userPrompt, temperature = 0.7) {
    if (!this.enabled) {
      console.warn('⚠️  LLM API未配置，使用本地分析');
      return this.getLocalAnalysis(userPrompt);
    }

    try {
      let response;

      if (this.provider === 'openai') {
        response = await this.callOpenAI(systemPrompt, userPrompt, temperature);
      } else if (this.provider === 'anthropic') {
        response = await this.callAnthropic(systemPrompt, userPrompt, temperature);
      } else if (this.provider === 'zhipu') {
        response = await this.callZhipu(systemPrompt, userPrompt, temperature);
      } else if (this.provider === 'local') {
        response = await this.callLocal(systemPrompt, userPrompt, temperature);
      }

      return response;

    } catch (error) {
      console.error(`❌ LLM API调用失败: ${error.message}`);
      console.log(`📝 回退到本地分析`);
      return this.getLocalAnalysis(userPrompt);
    }
  }

  /**
   * OpenAI API调用
   */
  async callOpenAI(systemPrompt, userPrompt, temperature) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return this.parseJSONResponse(content);
  }

  /**
   * Anthropic Claude API调用
   */
  async callAnthropic(systemPrompt, userPrompt, temperature) {
    const response = await axios.post(
      `${this.baseUrl}/messages`,
      {
        model: this.model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );

    const content = response.data.content[0].text;
    return this.parseJSONResponse(content);
  }

  /**
   * 智谱AI API调用 (GLM-4)
   */
  async callZhipu(systemPrompt, userPrompt, temperature) {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const content = response.data.choices[0].message.content;
    return this.parseJSONResponse(content);
  }

  /**
   * 本地模型API调用 (Ollama等)
   */
  async callLocal(systemPrompt, userPrompt, temperature) {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const content = response.data.message.content;
    return this.parseJSONResponse(content);
  }

  /**
   * 解析JSON响应
   */
  parseJSONResponse(content) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('未找到JSON格式的响应');
    } catch (error) {
      console.error('❌ JSON解析失败:', error.message);
      console.log('原始响应:', content);
      throw error;
    }
  }

  /**
   * 分析单条新闻
   */
  async analyzeNews(news, stockCode, stockName) {
    console.log(`🤖 LLM分析新闻: ${news.title}`);

    const systemPrompt = `你是一个专业的金融新闻分析师。你的任务是分析新闻对特定股票的影响。

请从以下维度进行分析：
1. 情感倾向: 正面/负面/中性 (1-100分，>60为正面，<40为负面)
2. 影响程度: 重大/显著/一般/轻微 (1-100分)
3. 关键信息: 提取3-5个关键点
4. 股价影响: 预期对股价的影响方向和幅度
5. 可信度: 评估新闻来源和内容的可信度 (1-100分)
6. 时间影响: 短期/中期/长期影响

请以JSON格式返回分析结果：
{
  "sentiment": "positive|negative|neutral",
  "sentimentScore": 75,
  "impact": "major|significant|moderate|minor",
  "impactScore": 80,
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "priceImpact": {
    "direction": "up|down|neutral",
    "probability": 0.75,
    "magnitude": "+5%",
    "reason": "影响原因"
  },
  "credibility": 85,
  "timeHorizon": "short|medium|long",
  "summary": "一句话总结"
}`;

    const userPrompt = `股票: ${stockName} (${stockCode})

新闻标题: ${news.title}
新闻内容: ${news.content || news.summary || '无详细内容'}
发布时间: ${news.publishTime || '未知'}
来源: ${news.source || '未知'}

请分析这条新闻对该股票的影响。`;

    try {
      const analysis = await this.callLLM(systemPrompt, userPrompt, 0.7);

      console.log(`✅ LLM分析完成:`);
      console.log(`   情感: ${analysis.sentiment} (${analysis.sentimentScore}分)`);
      console.log(`   影响: ${analysis.impact} (${analysis.impactScore}分)`);
      console.log(`   股价影响: ${analysis.priceImpact.direction} (${analysis.priceImpact.probability})`);

      return {
        newsId: news.id || news.newsId,
        title: news.title,
        analysis: analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ LLM分析失败: ${error.message}`);
      return this.getFallbackAnalysis(news);
    }
  }

  /**
   * 批量分析新闻
   */
  async analyzeNewsBatch(newsList, stockCode, stockName) {
    console.log(`🤖 LLM批量分析 ${newsList.length} 条新闻`);

    const results = [];
    const batchSize = 5; // 并发数限制

    for (let i = 0; i < newsList.length; i += batchSize) {
      const batch = newsList.slice(i, i + batchSize);
      const promises = batch.map(news =>
        this.analyzeNews(news, stockCode, stockName)
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 综合新闻面评分
   */
  async calculateNewsScore(newsList, stockCode, stockName) {
    console.log(`🤖 计算新闻面综合评分: ${stockCode}`);

    if (!newsList || newsList.length === 0) {
      return this.getDefaultNewsScore();
    }

    // 使用LLM分析新闻
    const analyses = await this.analyzeNewsBatch(newsList, stockCode, stockName);

    // 计算综合评分
    const validAnalyses = analyses.filter(a => a.analysis);

    if (validAnalyses.length === 0) {
      return this.getDefaultNewsScore();
    }

    // 情感评分 (0-100)
    const sentimentScores = validAnalyses.map(a => a.analysis.sentimentScore || 50);
    const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;

    // 影响评分 (0-100)
    const impactScores = validAnalyses.map(a => a.analysis.impactScore || 50);
    const avgImpact = impactScores.reduce((a, b) => a + b, 0) / impactScores.length;

    // 可信度评分 (0-100)
    const credibilityScores = validAnalyses.map(a => a.analysis.credibility || 50);
    const avgCredibility = credibilityScores.reduce((a, b) => a + b, 0) / credibilityScores.length;

    // 股价影响方向
    const priceImpacts = validAnalyses.map(a => a.analysis.priceImpact);
    const positiveCount = priceImpacts.filter(p => p.direction === 'up').length;
    const negativeCount = priceImpacts.filter(p => p.direction === 'down').length;
    const netBias = positiveCount - negativeCount;

    // 综合新闻评分
    // 情感60% + 影响30% + 可信度10%
    const overallScore = (
      avgSentiment * 0.60 +
      avgImpact * 0.30 +
      avgCredibility * 0.10
    );

    // 生成分析总结
    const summary = this.generateNewsSummary(validAnalyses, overallScore, netBias);

    const result = {
      overall: overallScore,
      sentiment: avgSentiment,
      impact: avgImpact,
      credibility: avgCredibility,
      netBias: netBias,
      bias: netBias > 2 ? 'bullish' : netBias < -2 ? 'bearish' : 'neutral',
      newsCount: validAnalyses.length,
      analyses: validAnalyses,
      summary: summary,
      grade: this.getGrade(overallScore)
    };

    console.log(`✅ 新闻面评分完成:`);
    console.log(`   综合评分: ${overallScore.toFixed(2)} (${result.grade})`);
    console.log(`   情感: ${avgSentiment.toFixed(2)}`);
    console.log(`   影响: ${avgImpact.toFixed(2)}`);
    console.log(`   偏向: ${result.bias} (${netBias > 0 ? '+' : ''}${netBias})`);

    return result;
  }

  /**
   * 生成新闻面总结
   */
  generateNewsSummary(analyses, overallScore, netBias) {
    const parts = [];

    // 整体情感
    const avgSentiment = analyses.reduce((sum, a) =>
      sum + (a.analysis.sentimentScore || 50), 0) / analyses.length;

    if (avgSentiment >= 70) {
      parts.push('整体情绪积极');
    } else if (avgSentiment >= 50) {
      parts.push('整体情绪中性偏正面');
    } else if (avgSentiment >= 30) {
      parts.push('整体情绪中性偏负面');
    } else {
      parts.push('整体情绪消极');
    }

    // 影响程度
    const avgImpact = analyses.reduce((sum, a) =>
      sum + (a.analysis.impactScore || 50), 0) / analyses.length;

    if (avgImpact >= 70) {
      parts.push('存在重大影响');
    } else if (avgImpact >= 50) {
      parts.push('影响较为显著');
    } else {
      parts.push('影响相对温和');
    }

    // 方向性
    if (netBias >= 3) {
      parts.push('利好消息占优');
    } else if (netBias <= -3) {
      parts.push('利空消息占优');
    }

    // 关键信息
    const keyPoints = analyses.slice(0, 3).map(a =>
      a.analysis.keyPoints ? a.analysis.keyPoints[0] : null
    ).filter(Boolean);

    if (keyPoints.length > 0) {
      parts.push(`主要关注: ${keyPoints.join('、')}`);
    }

    return parts.join('，') + '。';
  }

  /**
   * 本地分析（回退方案）
   */
  getLocalAnalysis(prompt) {
    console.log('📝 使用本地规则分析');

    // 简单的规则分析
    const positiveKeywords = ['增长', '盈利', '突破', '创新', '合作', '增持', '回购', '分红'];
    const negativeKeywords = ['下滑', '亏损', '减持', '调查', '处罚', '风险', '下跌', '跌停'];

    let score = 50;
    let sentiment = 'neutral';
    let positiveCount = 0;
    let negativeCount = 0;

    positiveKeywords.forEach(kw => {
      if (prompt.includes(kw)) {
        positiveCount++;
        score += 5;
      }
    });

    negativeKeywords.forEach(kw => {
      if (prompt.includes(kw)) {
        negativeCount++;
        score -= 5;
      }
    });

    score = Math.max(0, Math.min(100, score));

    if (score > 60) sentiment = 'positive';
    if (score < 40) sentiment = 'negative';

    return {
      sentiment: sentiment,
      sentimentScore: score,
      impact: score > 65 || score < 35 ? 'major' : 'moderate',
      impactScore: Math.abs(score - 50) * 1.5 + 25,
      keyPoints: [
        sentiment === 'positive' ? '发现积极因素' : '发现消极因素'
      ],
      priceImpact: {
        direction: score > 50 ? 'up' : score < 50 ? 'down' : 'neutral',
        probability: 0.6,
        magnitude: score > 60 ? '+3%' : score < 40 ? '-3%' : '0%',
        reason: '基于关键词规则分析'
      },
      credibility: 60,
      timeHorizon: 'medium',
      summary: sentiment === 'positive' ? '整体偏正面' : sentiment === 'negative' ? '整体偏负面' : '中性'
    };
  }

  /**
   * 回退分析
   */
  getFallbackAnalysis(news) {
    return {
      newsId: news.id,
      title: news.title,
      analysis: this.getLocalAnalysis(news.title + ' ' + (news.content || '')),
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  /**
   * 默认评分
   */
  getDefaultNewsScore() {
    return {
      overall: 50,
      sentiment: 50,
      impact: 50,
      credibility: 50,
      netBias: 0,
      bias: 'neutral',
      newsCount: 0,
      analyses: [],
      summary: '暂无新闻数据',
      grade: 'C'
    };
  }

  /**
   * 获取评级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  }

  /**
   * 检查服务状态
   */
  async checkStatus() {
    if (!this.enabled) {
      return {
        enabled: false,
        provider: this.provider,
        message: 'LLM API未配置，在.env中设置LLM_API_KEY',
        recommendation: '可使用本地分析功能'
      };
    }

    try {
      // 测试API调用
      await this.callLLM(
        '你是一个测试助手。',
        '请回复JSON: {"status": "ok"}',
        0.1
      );

      return {
        enabled: true,
        provider: this.provider,
        model: this.model,
        message: `${this.provider} API连接正常`
      };
    } catch (error) {
      return {
        enabled: false,
        provider: this.provider,
        message: `LLM API连接失败: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new LLMNewsAnalyzer();
