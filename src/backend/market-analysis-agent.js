/**
 * 股市分析Agent
 * 基于新闻内容进行宏观和微观分析
 */

const aiService = require('./ai-service');

/**
 * 生成股市分析
 * @param {Object} news - 新闻对象
 * @returns {Promise<Object>} - 分析结果
 */
async function generateMarketAnalysis(news) {
  const apiKey = aiService.getApiKeyStatus().keys?.zhipu || aiService.getApiKeyStatus().keys?.claude;

  if (!apiKey) {
    // Demo模式分析
    return generateDemoAnalysis(news);
  }

  try {
    const prompt = buildAnalysisPrompt(news);
    const response = await aiService.chat(prompt, [], [{
      role: 'system',
      content: '你是一位专业的股市分析师，擅长从宏观经济和微观企业角度分析新闻对市场的影响。'
    }]);

    // 解析AI返回的分析结果
    return parseAnalysisResponse(response.response, news);
  } catch (error) {
    console.error('股市分析生成失败:', error.message);
    return generateDemoAnalysis(news);
  }
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(news) {
  const keywords = news.keywords ? news.keywords.join('、') : '无';
  return `请对以下新闻进行股市分析，从宏观和微观角度分析其对市场的影响：

新闻标题：${news.title}
新闻分类：${news.category}
新闻摘要：${news.description}
新闻关键词：${keywords}

请按以下结构进行分析：
1. 市场影响概述（50字以内）
2. 宏观经济影响（3-5点）
3. 相关行业/板块影响
4. 投资建议
5. 风险提示

请以JSON格式返回，格式如下：
{
  "marketImpact": "市场影响概述",
  "macroAnalysis": ["宏观经济影响点1", "点2", "点3"],
  "sectorImpact": "受影响的行业/板块",
  "investmentAdvice": "投资建议",
  "riskWarning": "风险提示"
}`;
}

/**
 * 解析AI响应
 */
function parseAnalysisResponse(response, news) {
  try {
    // 尝试解析JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('JSON解析失败，使用demo分析');
  }

  return generateDemoAnalysis(news);
}

/**
 * 生成Demo分析（无API密钥时）
 */
function generateDemoAnalysis(news) {
  const categoryAnalysis = {
    '财经': {
      marketImpact: '该财经新闻对市场产生直接利好，相关板块有望受益。',
      macroAnalysis: [
        '影响货币政策和市场流动性',
        '提振投资者信心，改善市场预期',
        '促进相关行业发展和经济转型'
      ],
      sectorImpact: '金融、地产、基建等板块',
      investmentAdvice: '建议关注政策受益板块，把握结构性机会。',
      riskWarning: '注意市场波动风险，合理控制仓位。'
    },
    '科技': {
      marketImpact: '科技新闻刺激相关概念股，市场关注度提升。',
      macroAnalysis: [
        '推动技术创新和产业升级',
        '提升国家科技竞争力',
        '带动上下游产业链发展'
      ],
      sectorImpact: '半导体、人工智能、通信等科技板块',
      investmentAdvice: '可关注核心技术企业和产业链龙头企业。',
      riskWarning: '概念炒作风险较高，需注意估值泡沫。'
    },
    '国际': {
      marketImpact: '国际新闻影响全球市场情绪，A股或受外盘影响。',
      macroAnalysis: [
        '影响国际贸易和外交关系',
        '改变地缘政治格局',
        '影响跨境投资和汇率'
      ],
      sectorImpact: '进出口贸易、涉外业务板块',
      investmentAdvice: '建议关注外向型企业和避险资产。',
      riskWarning: '外部不确定性增加，需警惕系统性风险。'
    },
    '时政': {
      marketImpact: '政策新闻影响市场预期，相关主题投资机会显现。',
      macroAnalysis: [
        '引导社会资源和资金流向',
        '推动相关产业发展和改革',
        '提升市场对经济前景的信心'
      ],
      sectorImpact: '根据政策导向的相关板块',
      investmentAdvice: '关注政策落地情况和受益标的。',
      riskWarning: '政策效果存在不确定性，需持续跟踪。'
    }
  };

  return categoryAnalysis[news.category] || categoryAnalysis['财经'];
}

module.exports = {
  generateMarketAnalysis
};
