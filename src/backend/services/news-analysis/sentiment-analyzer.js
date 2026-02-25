/**
 * Sentiment Analyzer
 * 情感分析器
 *
 * 功能：
 * 1. 金融文本情感分析
 * 2. 情感分类（positive/neutral/negative）
 * 3. 情感评分（-1到1）
 * 4. 置信度评估
 */

class SentimentAnalyzer {
  constructor() {
    // 金融情感词典
    this.positiveWords = [
      '上涨', '利好', '突破', '创新高', '增长', '提升', '改善',
      '积极', '看好', '强劲', '上涨', '反弹', '回升', '繁荣',
      '增加', '扩大', '优化', '升级', '推进', '加速', '拉动'
    ];

    this.negativeWords = [
      '下跌', '利空', '暴跌', '创新低', '下滑', '下降', '恶化',
      '消极', '看空', '疲软', '调整', '回调', '走低', '衰退',
      '减少', '收缩', '放缓', '降级', '推迟', '放缓', '拖累'
    ];

    // 情感修饰词
    this.intensifiers = {
      '非常': 1.5,
      '特别': 1.5,
      '极其': 1.8,
      '十分': 1.3,
      '大幅': 1.6,
      '显著': 1.4,
      '明显': 1.3,
      '略微': 0.7,
      '小幅': 0.7,
      '稍微': 0.7
    };
  }

  /**
   * 分析文本情感
   * @param {string} text - 要分析的文本
   */
  async analyze(text) {
    if (!text || typeof text !== 'string') {
      return {
        label: 'neutral',
        score: 0,
        confidence: 0
      };
    }

    // 简单的基于词典的情感分析
    const result = this.dictionaryBasedAnalysis(text);

    // TODO: Phase 3 集成FinBERT
    // if (process.env.FINBERT_API_URL) {
    //   return await this.analyzeWithFinBERT(text);
    // }

    return result;
  }

  /**
   * 基于词典的情感分析
   */
  dictionaryBasedAnalysis(text) {
    const lowerText = text.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;
    let totalScore = 0;
    let modifier = 1.0;

    // 检查修饰词
    for (const [word, factor] of Object.entries(this.intensifiers)) {
      if (text.includes(word)) {
        modifier = factor;
        break;
      }
    }

    // 统计积极词汇
    for (const word of this.positiveWords) {
      const regex = new RegExp(word, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        positiveCount += matches.length;
        totalScore += matches.length * modifier;
      }
    }

    // 统计消极词汇
    for (const word of this.negativeWords) {
      const regex = new RegExp(word, 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        negativeCount += matches.length;
        totalScore -= matches.length * modifier;
      }
    }

    // 计算情感分数
    const totalWords = positiveCount + negativeCount;
    let score = 0;
    let label = 'neutral';
    let confidence = 0;

    if (totalWords === 0) {
      // 没有情感词，判断为中性
      score = 0;
      label = 'neutral';
      confidence = 0.3;
    } else {
      // 归一化分数到 -1 到 1
      score = Math.max(-1, Math.min(1, totalScore / totalWords));

      // 确定标签
      if (score > 0.2) {
        label = 'positive';
      } else if (score < -0.2) {
        label = 'negative';
      } else {
        label = 'neutral';
      }

      // 置信度基于情感词数量
      confidence = Math.min(1.0, totalWords / 5);
    }

    return {
      label: label,
      score: parseFloat(score.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(2)),
      positiveCount: positiveCount,
      negativeCount: negativeCount,
      method: 'dictionary'
    };
  }

  /**
   * 验证情感分析结果
   * 用于对比Claude的情感判断和独立分析结果
   */
  validate(claudeSentiment, claudeScore, text) {
    const independentResult = this.analyze(text);

    const agreement = independentResult.label === claudeSentiment;
    const scoreDiff = Math.abs(independentResult.score - claudeScore);

    return {
      claudeSentiment: claudeSentiment,
      claudeScore: claudeScore,
      independentSentiment: independentResult.label,
      independentScore: independentResult.score,
      agreement: agreement,
      scoreDifference: scoreDiff,
      confidence: independentResult.confidence
    };
  }
}

module.exports = SentimentAnalyzer;
