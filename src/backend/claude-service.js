const Anthropic = require('@anthropic-ai/sdk');

// Simulated API key storage (in production, this would come from database)
let apiKey = null;

function setApiKey(key) {
  apiKey = key;
}

function hasApiKey() {
  return !!apiKey;
}

async function generateDailyBrief(newsItems) {
  if (!apiKey) {
    return {
      summary: 'Demo mode: Please configure your Claude API key in settings to generate AI briefs.',
      keyPoints: ['Configure API key in settings', 'System will generate personalized briefs'],
      importance: 'N/A'
    };
  }

  const client = new Anthropic({ apiKey });

  const newsSummary = newsItems.map(item =>
    `- ${item.title} (${item.sourceName})`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Based on the following news headlines, generate a daily brief in Chinese. Format your response as JSON with these fields:
        - summary: A 2-3 sentence summary of today's most important news
        - keyPoints: Array of 3-5 key points from today's news
        - importance: An assessment of today's news importance (High/Medium/Low)

        News headlines:
        ${newsSummary}`
      }]
    });

    const responseText = message.content[0].text;

    // Try to parse as JSON
    try {
      return JSON.parse(responseText);
    } catch (e) {
      // If not valid JSON, return structured response
      return {
        summary: responseText.substring(0, 200),
        keyPoints: ['AI生成摘要'],
        importance: 'Medium'
      };
    }
  } catch (error) {
    console.error('Claude API error:', error.message);
    return {
      summary: 'Failed to generate AI brief. Please try again later.',
      keyPoints: ['API Error occurred'],
      importance: 'Error'
    };
  }
}

async function chatAboutNews(userQuestion, newsItems) {
  if (!apiKey) {
    return '请先在设置页面配置 Claude API 密钥。';
  }

  const client = new Anthropic({ apiKey });

  const newsContext = newsItems.slice(0, 10).map(item =>
    `标题: ${item.title}\n来源: ${item.sourceName}\n描述: ${item.description}\n`
  ).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `你是一个政治新闻助手。基于以下新闻内容回答用户的问题。用中文回答。

        新闻内容:
        ${newsContext}

        用户问题: ${userQuestion}`
      }]
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude chat API error:', error.message);
    return '抱歉，AI助手暂时无法回答。请稍后再试。';
  }
}

module.exports = {
  setApiKey,
  hasApiKey,
  generateDailyBrief,
  chatAboutNews
};
