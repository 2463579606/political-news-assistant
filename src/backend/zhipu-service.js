const https = require('https');

/**
 * 智谱AI服务
 * 支持GLM-4系列模型
 */

const ZHIPU_API_BASE = 'https://open.bigmodel.cn/api/paas/v4';

/**
 * 调用智谱AI API
 * @param {string} endpoint - API端点 (chat/completions等)
 * @param {object} data - 请求数据
 * @param {string} apiKey - API密钥
 */
async function callZhipuAPI(endpoint, data, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `${ZHIPU_API_BASE}${endpoint}`;
    const postData = JSON.stringify(data);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error: ${parsed.error?.message || responseData}`));
          }
        } catch (error) {
          reject(new Error(`Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 生成每日简报
 * @param {Array} news - 新闻文章列表
 * @param {string} apiKey - API密钥
 */
async function generateDailyBrief(news, apiKey) {
  const newsText = news.map(n => `- ${n.title}: ${n.description}`).join('\n');

  const prompt = `你是一个专业的新闻助手。请基于以下新闻生成一份每日简报，包含以下部分：

1. 今日头条（选择最重要的2-3条新闻）
2. 快讯摘要（其他重要新闻简要概括）
3. 关键词提炼

新闻列表：
${newsText}

请用JSON格式返回，包含以下字段：
{
  "summary": "今日头条摘要（2-3句话）",
  "headlines": ["头条1", "头条2", "头条3"],
  "briefs": ["快讯1", "快讯2", ...],
  "keywords": ["关键词1", "关键词2", ...],
  "importance": "高/中/低"
}`;

  try {
    const response = await callZhipuAPI('/chat/completions', {
      model: 'glm-4-flash',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, apiKey);

    const content = response.choices[0].message.content;

    // 尝试解析JSON响应
    try {
      return JSON.parse(content);
    } catch {
      // 如果不是JSON格式，返回文本
      return {
        summary: content,
        headlines: [],
        briefs: [],
        keywords: [],
        importance: '中'
      };
    }
  } catch (error) {
    console.error('智谱AI简报生成失败:', error.message);
    throw error;
  }
}

/**
 * AI对话
 * @param {string} message - 用户消息
 * @param {Array} news - 新闻文章列表（可选）
 * @param {Array} history - 对话历史（可选）
 * @param {string} apiKey - API密钥
 */
async function chat(message, news = [], history = [], apiKey) {
  const newsContext = news.length > 0
    ? `\n\n参考新闻：\n${news.map(n => `- ${n.title}: ${n.description}`).join('\n')}`
    : '';

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的时政新闻助手，擅长分析新闻事件、回答用户问题。请基于提供的新闻信息回答用户的问题，如果问题超出新闻范围，请礼貌地说明。`
    },
    ...history,
    {
      role: 'user',
      content: message + newsContext
    }
  ];

  try {
    const response = await callZhipuAPI('/chat/completions', {
      model: 'glm-4-flash',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9
    }, apiKey);

    return {
      response: response.choices[0].message.content,
      usage: response.usage
    };
  } catch (error) {
    console.error('智谱AI对话失败:', error.message);
    throw error;
  }
}

/**
 * 测试API连接
 * @param {string} apiKey - API密钥
 */
async function testConnection(apiKey) {
  try {
    const response = await callZhipuAPI('/chat/completions', {
      model: 'glm-4-flash',
      messages: [
        {
          role: 'user',
          content: '你好，请回复"测试成功"'
        }
      ],
      max_tokens: 50
    }, apiKey);

    return {
      success: true,
      response: response.choices[0].message.content
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateDailyBrief,
  chat,
  testConnection
};
