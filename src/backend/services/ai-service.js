// ============================================
// Claude AI Service
// ============================================

/**
 * 调用 Claude API 生成新闻摘要
 */
async function generateSummary(news, apiKey) {
  if (!apiKey) {
    throw new Error('Claude API Key is required');
  }

  const prompt = `请为以下新闻生成一个简明扼要的摘要（100-200字）：

标题：${news.title}
来源：${news.sourceName}
内容：${news.description || news.content || '无详细内容'}

请突出关键信息和影响。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw error;
  }
}

/**
 * 调用 Claude API 生成每日简报
 */
async function generateDailyBrief(newsList, apiKey) {
  if (!apiKey) {
    throw new Error('Claude API Key is required');
  }

  const newsText = newsList
    .map((news, index) => `${index + 1}. ${news.title}\n   ${news.description || '无详细内容'}`)
    .join('\n\n');

  const prompt = `请基于以下新闻列表生成一份AI每日简报。要求：

1. 将新闻按主题分类（时政要闻、财经动态、国际关注、科技前沿等）
2. 每条新闻用1句话概括要点
3. 使用简洁、专业的语言
4. 总共不超过300字
5. 使用emoji点缀，使版面更生动

新闻列表：
${newsText}

请以markdown格式输出：`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Failed to generate daily brief:', error);
    throw error;
  }
}

/**
 * 调用 Claude API 进行新闻追问对话
 */
async function askNews(news, question, conversationHistory, apiKey) {
  if (!apiKey) {
    throw new Error('Claude API Key is required');
  }

  const newsContext = `新闻标题：${news.title}
新闻来源：${news.sourceName}
发布时间：${news.publishedAt}
新闻内容：${news.description || news.content || '无详细内容'}
关键词：${news.keywords?.join(', ') || '无'}`;

  const messages = [
    {
      role: 'user',
      content: `你是一个专业的新闻助手，擅长分析时政新闻。我将提供一篇新闻，请基于新闻内容回答我的问题。

${newsContext}

请基于以上新闻内容回答我的问题。如果问题与新闻无关，请礼貌地说明。`,
    },
  ];

  // 添加对话历史
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  messages.push({
    role: 'user',
    content: question,
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Failed to ask news:', error);
    throw error;
  }
}

module.exports = {
  generateSummary,
  generateDailyBrief,
  askNews,
};
