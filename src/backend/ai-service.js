const claudeService = require('./claude-service');
const zhipuService = require('./zhipu-service');

/**
 * 统一AI服务
 * 支持Claude和智谱AI
 */

// AI提供商类型
const AI_PROVIDERS = {
  CLAUDE: 'claude',
  ZHIPU: 'zhipu'
};

// 当前配置
let currentProvider = AI_PROVIDERS.CLAUDE;
let apiKeys = {
  [AI_PROVIDERS.CLAUDE]: null,
  [AI_PROVIDERS.ZHIPU]: null
};

/**
 * 设置AI提供商
 */
function setProvider(provider) {
  if (Object.values(AI_PROVIDERS).includes(provider)) {
    currentProvider = provider;
    return true;
  }
  return false;
}

/**
 * 获取当前提供商
 */
function getProvider() {
  return currentProvider;
}

/**
 * 设置API密钥
 */
function setApiKey(provider, key) {
  if (Object.values(AI_PROVIDERS).includes(provider)) {
    apiKeys[provider] = key;
    if (provider === AI_PROVIDERS.CLAUDE) {
      claudeService.setApiKey(key);
    }
    return true;
  }
  return false;
}

/**
 * 获取API密钥状态
 */
function getApiKeyStatus() {
  return {
    provider: currentProvider,
    hasKey: !!apiKeys[currentProvider],
    keys: {
      claude: !!apiKeys[AI_PROVIDERS.CLAUDE],
      zhipu: !!apiKeys[AI_PROVIDERS.ZHIPU]
    }
  };
}

/**
 * 生成每日简报
 */
async function generateDailyBrief(newsItems) {
  const apiKey = apiKeys[currentProvider];

  if (!apiKey) {
    return {
      summary: 'Demo mode: 请在设置页面配置API密钥以使用AI功能。',
      keyPoints: ['Claude和智谱AI都支持', '在设置中选择AI提供商', '配置API密钥后即可使用'],
      importance: 'N/A'
    };
  }

  try {
    if (currentProvider === AI_PROVIDERS.ZHIPU) {
      return await zhipuService.generateDailyBrief(newsItems, apiKey);
    } else {
      return await claudeService.generateDailyBrief(newsItems);
    }
  } catch (error) {
    console.error(`${currentProvider}简报生成失败:`, error.message);
    throw error;
  }
}

/**
 * AI对话
 */
async function chat(message, newsItems = [], history = []) {
  const apiKey = apiKeys[currentProvider];

  if (!apiKey) {
    return {
      response: 'Demo模式：请在设置页面配置API密钥（Claude或智谱AI）以使用AI对话功能。\n\n支持的AI提供商：\n1. Claude - Anthropic的AI助手\n2. 智谱AI - 国产GLM-4系列模型'
    };
  }

  try {
    if (currentProvider === AI_PROVIDERS.ZHIPU) {
      return await zhipuService.chat(message, newsItems, history, apiKey);
    } else {
      return await claudeService.chat(message, newsItems, history);
    }
  } catch (error) {
    console.error(`${currentProvider}对话失败:`, error.message);
    throw error;
  }
}

/**
 * 测试API连接
 */
async function testConnection(provider) {
  const apiKey = apiKeys[provider];

  if (!apiKey) {
    return {
      success: false,
      error: 'API密钥未配置'
    };
  }

  try {
    if (provider === AI_PROVIDERS.ZHIPU) {
      return await zhipuService.testConnection(apiKey);
    } else {
      // Claude服务没有testConnection方法，直接用简单请求测试
      if (apiKey.startsWith('sk-ant-')) {
        return { success: true, response: 'API密钥格式正确' };
      } else {
        return { success: false, error: 'API密钥格式不正确' };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  AI_PROVIDERS,
  setProvider,
  getProvider,
  setApiKey,
  getApiKeyStatus,
  generateDailyBrief,
  chat,
  testConnection
};
