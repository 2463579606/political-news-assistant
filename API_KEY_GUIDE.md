# 政治新闻助手 - 重要说明

## 📢 关于新闻数据的重要说明

根据产品需求文档（PRD v1.0），本产品采用以下设计：

### API Key 配置要求

1. **AI分析功能**：需要用户自备 Claude API Key
   - 配置位置：设置页面
   - 获取地址：https://console.anthropic.com/

2. **新闻数据源**：推荐使用第三方新闻API服务
   - **NewsAPI.org**（推荐）
     - 免费套餐：100次/天
     - 注册地址：https://newsapi.org/register
     - 支持实时新闻，延迟 < 5分钟
     - 覆盖全球主流媒体

   - **GNews API**
     - 免费套餐：100次/天
     - 注册地址：https://gnews.io/

   - **Newscatcher API**
     - 专注于时政、财经新闻
     - 注册地址：https://newscatcher-api.com/

### 配置方法

在服务器的 `.env` 文件中添加：

```bash
# AI分析API（可选）
OPENAI_API_KEY=sk-ant-xxxxx  # Claude API Key

# 新闻数据API（推荐配置以下任一）
NEWS_API_KEY=xxxxxxxxxxxxx  # NewsAPI.org API Key
# 或
GNEWS_API_KEY=xxxxxxxxxxxxx  # GNews API Key
```

配置完成后重启服务：
```bash
pm2 restart political-backend
pm2 save
```

### 为什么需要API Key？

1. **实时性保证**：专业API提供秒级更新的新闻
2. **数据质量**：经过验证的权威媒体源
3. **合规性**：使用正规API服务，符合爬虫规范
4. **产品定位**：辅助投资决策需要准确可靠的数据

### 临时方案

在未配置API Key前，系统会显示：
- 市场数据：正常（来自东方财富网官方API，免费）
- 股市公告：正常（基于真实市场数据）
- 新闻数据：系统提示消息

---

## 当前系统状态

✅ **市场数据**：完全正常
- 上证指数、深证成指等实时数据
- 数据源：东方财富网官方API
- 更新频率：30秒

✅ **股市公告**：完全正常
- 基于真实市场数据生成
- 包含指数、板块、情绪分析

⚠️ **新闻数据**：需要配置API Key
- 当前状态：显示系统提示
- 解决方案：注册 NewsAPI.org 或其他新闻API服务

---

## 推荐行动

1. 注册 NewsAPI.org（免费100次/天，足够个人使用）
2. 在服务器配置 `.env` 文件
3. 重启后端服务

**注册地址**：https://newsapi.org/register

---

生成时间：2025-02-23
产品版本：v1.0
