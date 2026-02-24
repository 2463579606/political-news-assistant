# 时政新闻助手 - 技术架构设计文档

## 文档信息
- **版本**: v1.0
- **创建日期**: 2026-02-13
- **状态**: 设计中

---

## 1. 技术栈最终确定

### 1.1 前端技术栈

| 技术层 | 选型 | 版本 | 理由 |
|--------|------|------|------|
| **Web框架** | Next.js | 15.x | React Server Components，App Router，性能优秀 |
| **UI组件库** | shadcn/ui | latest | 基于 Radix UI，高度可定制，无运行时依赖 |
| **样式** | Tailwind CSS | 3.x | 快速开发，样式一致性 |
| **状态管理** | Zustand | 5.x | 轻量简洁，TypeScript友好 |
| **数据获取** | TanStack Query | 5.x | 强大的缓存和同步机制 |
| **桌面框架** | Tauri | 2.x | 轻量，安全，Rust后端，打包体积小 |
| **表单处理** | React Hook Form | 7.x | 性能优秀，验证简单 |
| **日期处理** | date-fns | 4.x | 轻量，tree-shakeable |
| **Markdown渲染** | react-markdown | 15.x | AI对话内容渲染 |
| **类型检查** | TypeScript | 5.x | 类型安全 |

### 1.2 后端技术栈

| 技术层 | 选型 | 版本 | 理由 |
|--------|------|------|------|
| **运行时** | Bun | 1.x | 快速，兼容Node.js，原生TypeScript |
| **Web框架** | Hono | 4.x | 轻量快速，边缘运行时友好 |
| **ORM** | Drizzle ORM | latest | TypeScript优先，轻量，SQL可控 |
| **主数据库** | PostgreSQL | 16.x | 关系型，JSON支持，全文搜索 |
| **缓存** | Redis | 7.x | 高性能缓存，Session存储 |
| **队列** | BullMQ | 5.x | 基于Redis，支持调度 |
| **验证** | Zod | 3.x | TypeScript Schema验证 |
| **API文档** | OpenAPI | 3.1 | 自动生成文档 |

### 1.3 数据源和AI

| 服务 | 选型 | 用途 |
|------|------|------|
| **新闻API** | NewsAPI.org | MVP阶段（免费100请求/天） |
| **备用源** | RSS feeds | 补充数据源 |
| **AI模型** | Claude API | 用户自备API Key |
| **向量化（未来）** | Qdrant | 新闻向量检索和推荐 |

### 1.4 部署和基础设施

| 服务 | 选型 | 用途 |
|------|------|------|
| **前端部署** | Vercel | Next.js托管，自动HTTPS |
| **后端部署** | Fly.io | 边缘部署，PostgreSQL集成 |
| **桌面打包** | Tauri CLI | 本地打包 |
| **监控（未来）** | Sentry | 错误追踪 |
| **分析（未来）** | Plausible | 隐私友好的分析 |

---

## 2. 系统架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           用户层                                │
├──────────────────────┬────────────────────────────────────────┤
│   Web Browser        │         Desktop App (Tauri)              │
│   (Next.js SSR)      │         (嵌入式WebView)                 │
└──────────┬───────────┴─────────────────┬──────────────────────┘
           │                             │
           └──────────┬──────────────────┘
                      │ HTTPS
           ┌──────────▼──────────────────┐
           │     API Gateway / CDN       │
           │      (Vercel Edge)          │
           └──────────┬──────────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
│  Next.js   │ │   API    │ │  Static     │
│  (Web UI)  │ │  Server  │ │  Assets    │
└──────┬──────┘ └────┬─────┘ └─────────────┘
       │              │
       │    ┌─────────┴────────┐
       │    │                  │
┌──────▼────▼──┐      ┌────────▼────────┐
│  PostgreSQL  │      │  Redis Cache    │
│  (主数据)    │      │  (会话/缓存)     │
└─────────────┘      └─────────────────┘
       │
┌──────▼────────────────────────────────┐
│     外部服务                           │
├──────────────┬─────────┬───────────────┤
│  NewsAPI.org │ Claude  │   RSS Feeds   │
│  (新闻数据)  │  (AI)   │  (备用数据)   │
└──────────────┴─────────┴───────────────┘
```

### 2.2 数据流设计

#### 2.2.1 新闻获取流程

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Scheduler│───▶│News API │───▶│Filtering│───▶│ Database│
│ (Cron)  │    │  Fetch  │    │ Service │    │  Store  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                   │                              │
                   │           ┌────────────────┘
                   │           │
                   ▼           ▼
              ┌──────────────────┐
              │  AI Summary      │
              │  (Claude API)    │
              └──────────────────┘
```

#### 2.2.2 用户阅读流程

```
┌───────┐    ┌───────────┐    ┌──────────────┐
│ User  │───▶│ View News │───▶│ Ask Question │
└───────┘    └───────────┘    └──────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Claude API      │
                          │ (RAG/Search)    │
                          └─────────────────┘
```

### 2.3 应用分层架构

```
┌─────────────────────────────────────────────┐
│           Presentation Layer (UI)            │
│  - React Components (shadcn/ui)             │
│  - Pages (App Router)                       │
│  - State (Zustand)                          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Application Layer (Services)         │
│  - NewsService (新闻业务逻辑)                │
│  - AIService (AI对话逻辑)                    │
│  - UserService (用户管理)                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Domain Layer (Core)                 │
│  - Entities (News, User, Conversation)      │
│  - Value Objects                            │
│  - Domain Rules                             │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      Infrastructure Layer (Data)            │
│  - Database (PostgreSQL)                    │
│  - Cache (Redis)                            │
│  - External APIs (NewsAPI, Claude)          │
└─────────────────────────────────────────────┘
```

---

## 3. 数据库设计

### 3.1 ER图

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│    User     │       │    News      │       │ Category    │
├─────────────┤       ├──────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)      │◄──────│ id (PK)     │
│ email       │       │ title        │       │ name        │
│ name        │       │ url          │       │ slug        │
│ api_key     │       │ content      │       └─────────────┘
│ created_at  │       │ summary_ai   │
│ updated_at  │       │ source       │
└─────────────┘       │ published_at │
       │             │ category_id  │
       │             │ country      │
       │             │ language     │
       │             └──────┬───────┘
       │                    │
       │      ┌─────────────┼─────────────┐
       │      │             │             │
       ▼      ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Bookmark   │ │Conversation │ │  History    │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ id (PK)     │ │ id (PK)     │ │ id (PK)     │
│ user_id (FK)│ │ user_id (FK)│ │ user_id (FK)│
│ news_id (FK)│ │ news_id (FK)│ │ news_id (FK)│
│ created_at  │ │ title       │ │ viewed_at   │
└─────────────┘ │ messages    │ └─────────────┘
                │ created_at  │
                └─────────────┘
```

### 3.2 表结构定义

#### 3.2.1 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  claude_api_key_encrypted TEXT, -- 加密存储
  preferences JSONB DEFAULT '{
    "filter_keywords": [],
    "filter_sources": [],
    "filter_categories": ["entertainment"],
    "notification_enabled": true,
    "daily_digest": true,
    "digest_time": "08:00"
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

#### 3.2.2 新闻表 (news)

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_api_id VARCHAR(255) UNIQUE, -- NewsAPI返回的ID
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  url_to_image TEXT,
  content TEXT, -- 完整内容（如果有）
  description TEXT,
  summary_ai TEXT, -- AI生成的摘要
  source_name VARCHAR(255),
  source_id VARCHAR(255),
  author TEXT,
  published_at TIMESTAMP NOT NULL,
  category_id UUID REFERENCES categories(id),
  country VARCHAR(2), -- ISO 3166-1 alpha-2
  language VARCHAR(2), -- ISO 639-1
  importance_score DECIMAL(3,2) DEFAULT 0.5, -- 重要性评分
  keywords TEXT[], -- 提取的关键词
  is_breaking BOOLEAN DEFAULT FALSE, -- 是否为突发新闻
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_importance ON news(importance_score DESC);
CREATE INDEX idx_news_category ON news(category_id);
CREATE INDEX idx_news_country ON news(country);
CREATE INDEX idx_news_keywords ON news USING GIN(keywords);
CREATE INDEX idx_news_fulltext ON news USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));
```

#### 3.2.3 分类表 (categories)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color
  is_active BOOLEAN DEFAULT TRUE
);

-- 初始数据
INSERT INTO categories (name, slug, icon, color) VALUES
('时政', 'politics', 'Landmark', '#ef4444'),
('财经', 'business', 'TrendingUp', '#22c55e'),
('科技', 'technology', 'Cpu', '#3b82f6'),
('国际', 'world', 'Globe', '#8b5cf6'),
('其他', 'general', 'Newspaper', '#6b7280');
```

#### 3.2.4 收藏表 (bookmarks)

```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  notes TEXT, -- 用户笔记
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, news_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_created ON bookmarks(created_at DESC);
```

#### 3.2.5 对话表 (conversations)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID REFERENCES news(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]', -- [{role, content, timestamp}]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_news ON conversations(news_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

#### 3.2.6 阅读历史表 (reading_history)

```sql
CREATE TABLE reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  read_duration INTEGER DEFAULT 0, -- 阅读时长(秒)

  UNIQUE(user_id, news_id)
);

CREATE INDEX idx_history_user ON reading_history(user_id);
CREATE INDEX idx_history_viewed ON reading_history(viewed_at DESC);
```

### 3.3 数据视图

#### 3.3.1 每日新闻视图

```sql
CREATE VIEW daily_news_view AS
SELECT
  n.*,
  c.name as category_name,
  c.slug as category_slug,
  c.icon as category_icon,
  c.color as category_color,
  EXISTS(SELECT 1 FROM bookmarks b WHERE b.news_id = n.id AND b.user_id = ?) as is_bookmarked
FROM news n
LEFT JOIN categories c ON n.category_id = c.id
WHERE n.published_at >= CURRENT_DATE
ORDER BY n.importance_score DESC, n.published_at DESC;
```

---

## 4. API设计

### 4.1 API规范

- **RESTful风格**
- **OpenAPI 3.1规范**
- **JWT认证**（可选，用户系统开启时）
- **CORS配置**（生产环境限制域名）

### 4.2 API端点列表

#### 4.2.1 新闻相关

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/v1/news | 获取新闻列表 |
| GET | /api/v1/news/:id | 获取新闻详情 |
| GET | /api/v1/news/daily | 每日简报 |
| GET | /api/v1/news/search | 搜索新闻 |
| GET | /api/v1/news/categories | 获取分类 |
| GET | /api/v1/news/trending | 热门新闻 |

#### 4.2.2 AI相关

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | /api/v1/ai/chat | AI对话 |
| POST | /api/v1/ai/summary | 生成总结 |
| POST | /api/v1/ai/ask-news | 追问新闻 |

#### 4.2.3 用户相关

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/v1/user/profile | 用户信息 |
| PUT | /api/v1/user/profile | 更新信息 |
| PUT | /api/v1/user/preferences | 更新偏好 |
| PUT | /api/v1/user/api-key | 设置API Key |

#### 4.2.4 书签和历史

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | /api/v1/bookmarks | 收藏列表 |
| POST | /api/v1/bookmarks | 添加收藏 |
| DELETE | /api/v1/bookmarks/:id | 取消收藏 |
| GET | /api/v1/history | 阅读历史 |
| DELETE | /api/v1/history | 清除历史 |

### 4.3 API详细设计

#### 4.3.1 GET /api/v1/news

**请求参数：**
```typescript
{
  category?: string,      // 分类筛选
  country?: string,       // 国家代码
  language?: string,      // 语言
  page?: number,         // 页码（默认1）
  limit?: number,        // 每页数量（默认20，最大100）
  from?: string,         // ISO 8601日期
  to?: string,           // ISO 8601日期
  q?: string            // 搜索关键词
}
```

**响应：**
```typescript
{
  data: NewsItem[],
  pagination: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

#### 4.3.2 POST /api/v1/ai/ask-news

**请求：**
```typescript
{
  newsId: string,
  question: string,
  conversationId?: string  // 继续对话
}
```

**响应：**
```typescript
{
  conversationId: string,
  answer: string,
  sources: string[],  // AI检索到的来源
  timestamp: string
}
```

---

## 5. 前端设计

### 5.1 页面结构

```
/app
├── (auth)
│   ├── login
│   └── register
├── (dashboard)
│   ├── layout.tsx         # 主布局（导航、侧边栏）
│   ├── page.tsx           # 今日首页
│   ├── news
│   │   ├── [id]           # 新闻详情
│   │   ├── category       # 分类页
│   │   └── search         # 搜索页
│   ├── bookmarks          # 收藏页
│   ├── history            # 历史页
│   ├── chat               # AI对话页
│   └── settings           # 设置页
└── api                    # API路由（BFF）
```

### 5.2 核心页面设计

#### 5.2.1 今日首页 (Dashboard)

**布局：**
```
┌────────────────────────────────────────────────────┐
│  📰 时政助手                         🔔 👤  ⚙️    │
├──────────────┬───────────────────────────────────────┤
│              │  📅 2026年2月13日 星期四               │
│  🏠 首页     │  ────────────────────────────────     │
│  📰 新闻     │                                       │
│  🔖 收藏     │  📊 今日要闻 AI简报                    │
│  📜 历史     │  ┌─────────────────────────────┐     │
│  💬 助手     │  │ • [时政] XX事件...           │     │
│  ⚙️ 设置     │  │ • [财经] 市场波动...         │     │
│              │  │ • [国际] XX会议...           │     │
│              │  └─────────────────────────────┘     │
│              │                                       │
│  ┌────────┐ │  ────────────────────────────────     │
│  │ 时政   │ │  🔥 实时新闻                          │
│  │ 财经   │ │  • [新] XX...  2分钟前                │
│  │ 科技   │ │  • [新] XX...  15分钟前               │
│  │ 国际   │ │  • [新] XX...  1小时前                │
│  └────────┘ │                                       │
└──────────────┴───────────────────────────────────────┘
```

#### 5.2.2 新闻详情页

**布局：**
```
┌────────────────────────────────────────────────────┐
│  ← 返回                           🔖 收藏  💬 追问 │
├────────────────────────────────────────────────────┤
│                                                     │
│  [时政] 新闻标题                      来源 | 时间   │
│  ─────────────────────────────────────              │
│                                                     │
│  新闻内容...                                        │
│                                                     │
│  ─────────────────────────────────────              │
│                                                     │
│  🤖 AI智能总结                                      │
│  ┌────────────────────────────────────┐            │
│  │ 这是关于XX的总结...                 │            │
│  └────────────────────────────────────┘            │
│                                                     │
│  💬 对此新闻进行追问...                              │
│  ┌────────────────────────────────────┐            │
│  │ 输入您的问题...               [发送]│            │
│  └────────────────────────────────────┘            │
│                                                     │
│  相关新闻：                                         │
│  • XX...                                            │
└────────────────────────────────────────────────────┘
```

### 5.3 UI组件清单

```typescript
// shadcn/ui 基础组件
- Button, Input, Textarea
- Card, Dialog, Sheet
- Tabs, ScrollArea
- Badge, Avatar
- Dropdown Menu
- Toast/Sonner

// 自定义组件
components/
├── news/
│   ├── NewsCard.tsx          # 新闻卡片
│   ├── NewsList.tsx          # 新闻列表
│   ├── NewsDetail.tsx        # 新闻详情
│   ├── CategoryFilter.tsx    # 分类筛选
│   └── DailyBrief.tsx        # 每日简报
├── ai/
│   ├── ChatBox.tsx           # 对话框
│   ├── MessageList.tsx       # 消息列表
│   └── TypingIndicator.tsx   # 输入指示器
├── layout/
│   ├── Header.tsx            # 顶部导航
│   ├── Sidebar.tsx           # 侧边栏
│   └── MainLayout.tsx        # 主布局
└── common/
    ├── Loading.tsx           # 加载状态
    ├── EmptyState.tsx        # 空状态
    └── ErrorBoundary.tsx     # 错误边界
```

### 5.4 状态管理设计

```typescript
// stores/useNewsStore.ts
interface NewsState {
  newsList: NewsItem[]
  filters: NewsFilters
  loading: boolean
  error: string | null
  fetchNews: () => Promise<void>
  setFilters: (filters: Partial<NewsFilters>) => void
}

// stores/useChatStore.ts
interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  sendMessage: (newsId: string, question: string) => Promise<void>
  clearHistory: () => void
}

// stores/useUserStore.ts
interface UserState {
  user: User | null
  preferences: UserPreferences
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>
  setApiKey: (key: string) => Promise<void>
}
```

---

## 6. 后端服务设计

### 6.1 服务层结构

```
backend/
├── src/
│   ├── routes/
│   │   ├── news.ts            # 新闻路由
│   │   ├── ai.ts              # AI路由
│   │   ├── user.ts            # 用户路由
│   │   └── bookmarks.ts       # 书签路由
│   ├── services/
│   │   ├── NewsService.ts     # 新闻业务逻辑
│   │   ├── AIService.ts       # AI服务
│   │   ├── UserService.ts     # 用户服务
│   │   └── CacheService.ts    # 缓存服务
│   ├── models/
│   │   ├── News.ts
│   │   ├── User.ts
│   │   └── Conversation.ts
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema
│   │   └── connection.ts
│   ├── lib/
│   │   ├── newsapi.ts         # NewsAPI客户端
│   │   ├── claude.ts          # Claude客户端
│   │   └── redis.ts           # Redis客户端
│   └── workers/
│       ├── news-fetcher.ts    # 新闻抓取任务
│       └── ai-summarizer.ts   # AI总结任务
```

### 6.2 核心服务实现

#### 6.2.1 新闻服务 (NewsService)

```typescript
class NewsService {
  async fetchNews(params: FetchParams): Promise<News[]> {
    // 1. 检查缓存
    const cached = await cache.get(`news:${JSON.stringify(params)}`)
    if (cached) return cached

    // 2. 调用NewsAPI
    const data = await newsAPI.fetch(params)

    // 3. 过滤和分类
    const filtered = await this.filterNews(data)

    // 4. 存储到数据库
    await this.saveNews(filtered)

    // 5. 缓存结果
    await cache.set(`news:${JSON.stringify(params)}`, filtered, '5m')

    return filtered
  }

  async filterNews(news: News[]): Promise<News[]> {
    return news.filter(item => {
      // 过滤娱乐类
      if (this.isEntertainment(item)) return false
      // 应用用户自定义过滤规则
      if (this.matchesUserFilters(item)) return false
      return true
    })
  }
}
```

#### 6.2.2 AI服务 (AIService)

```typescript
class AIService {
  async generateSummary(news: News): Promise<string> {
    const prompt = `请用1-2句话总结这篇新闻的主要内容：
    标题：${news.title}
    内容：${news.content || news.description}

    要求：简洁、准确、客观。`

    const summary = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })

    return summary.content[0].text
  }

  async chatAboutNews(
    newsId: string,
    question: string,
    conversationHistory?: Message[]
  ): Promise<string> {
    const news = await this.getNewsWithFullContext(newsId)
    const messages = [
      {
        role: 'system' as const,
        content: `你是一个专业的新闻助手，基于以下新闻回答用户问题。
        如果用户的问题超出这篇新闻的范围，你可以使用你的知识库，
        但请明确说明哪些是新闻内容，哪些是你的补充知识。

        新闻标题：${news.title}
        发布时间：${news.published_at}
        来源：${news.source_name}
        内容：${news.content || news.description}`
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: question
      }
    ]

    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages
    })

    return response.content[0].text
  }
}
```

### 6.3 后台任务设计

#### 6.3.1 新闻定时抓取

```typescript
// workers/news-fetcher.ts
import { CronJob } from 'cron'

new CronJob('*/15 * * * *', async () => {  // 每15分钟
  console.log('Fetching news...')

  const categories = ['politics', 'business', 'technology']
  const countries = ['cn', 'us', 'gb', 'jp']

  for (const category of categories) {
    for (const country of countries) {
      await newsService.fetchAndSave({
        category,
        country,
        pageSize: 50
      })
    }
  }

  console.log('News fetch completed')
}).start()
```

#### 6.3.2 AI每日简报生成

```typescript
// workers/daily-brief.ts
import { CronJob } from 'cron'

new CronJob('0 7 * * *', async () => {  // 每天早上7点
  console.log('Generating daily brief...')

  // 获取昨日重要新闻
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const news = await db.news.findMany({
    where: {
      published_at: {
        gte: yesterday
      },
      importance_score: { gte: 0.7 }
    },
    orderBy: { importance_score: 'desc' },
    take: 20
  })

  // 生成简报
  const brief = await aiService.generateDailyBrief(news)

  // 缓存简报
  await cache.set('daily:brief', brief, '24h')

  console.log('Daily brief generated')
}).start()
```

---

## 7. 安全设计

### 7.1 API Key加密存储

```typescript
import { encrypt, decrypt } from '@/lib/crypto'

// 加密存储
async function storeApiKey(userId: string, apiKey: string) {
  const encrypted = await encrypt(apiKey)
  await db.users.update(userId, {
    claude_api_key_encrypted: encrypted
  })
}

// 解密使用
async function getUserApiKey(userId: string): Promise<string> {
  const user = await db.users.findUnique({ where: { id: userId } })
  return decrypt(user.claude_api_key_encrypted)
}
```

### 7.2 请求限流

```typescript
import { ratelimit } from '@/lib/redis'

// API限流
app.use('/api/v1/ai/*', async (c, next) => {
  const userId = c.get('userId')
  const { success } = await ratelimit.limit(`ai:${userId}`)

  if (!success) {
    return c.json({ error: 'Too many requests' }, 429)
  }

  await next()
})
```

---

## 8. 性能优化

### 8.1 缓存策略

| 数据类型 | 缓存时长 | 缓存键模式 |
|---------|---------|-----------|
| 新闻列表 | 5分钟 | `news:list:${hash(params)}` |
| 新闻详情 | 30分钟 | `news:detail:${id}` |
| 每日简报 | 24小时 | `daily:brief:${date}` |
| AI对话历史 | 1小时 | `chat:${conversationId}` |
| 用户偏好 | 永久 | `user:${userId}:prefs` |

### 8.2 数据库索引优化

已在数据库设计章节列出关键索引。

### 8.3 前端性能

- **图片懒加载**：使用 `next/image`
- **代码分割**：动态导入非关键组件
- **ISR缓存**：新闻列表页面使用增量静态再生
- **预取**：对可能访问的新闻进行预取

---

## 9. 部署架构

### 9.1 开发环境

```bash
# 本地开发
npm run dev            # Next.js dev server (端口3000)
npm run dev:api        # Backend dev server (端口3001)
npm run dev:worker     # Background workers

# 数据库
docker-compose up -d postgres redis
```

### 9.2 生产环境

```
┌─────────────────────────────────────────────────┐
│                   域名                           │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │  Vercel (前端)                       │       │
│  │  - Next.js App Router               │       │
│  │  - Edge Functions                   │       │
│  │  - Automatic HTTPS                  │       │
│  └──────────┬───────────────────────────┘       │
│             │                                     │
│  ┌──────────▼───────────────────────────┐       │
│  │  Fly.io (后端服务)                   │       │
│  │  - Hono API Server                  │       │
│  │  - PostgreSQL (托管)               │       │
│  │  - Redis (托管)                    │       │
│  │  - Cron Jobs (Workers)             │       │
│  └─────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │  桌面应用分发                         │       │
│  │  - GitHub Releases                  │       │
│  │  - Auto-updater                    │       │
│  └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────┘
```

---

## 10. MVP开发计划

### 10.1 功能优先级

**P0 - 核心功能（第一版必须）**
- ✅ 新闻聚合展示
- ✅ 基础过滤
- ✅ AI每日简报
- ✅ AI追问对话
- ✅ 收藏和历史记录
- ✅ 用户设置

**P1 - 重要功能（第二版）**
- ⏳ 推送通知
- ⏳ 高级搜索
- ⏳ 事件追踪

**P2 - 增强功能**
- ⏳ 个性化推荐
- ⏳ 数据可视化
- ⏳ 多语言支持

### 10.2 开发里程碑

| 阶段 | 任务 | 预计交付物 |
|-----|------|----------|
| **Phase 1** | 项目初始化、数据库搭建 | 可运行的项目骨架 |
| **Phase 2** | 新闻API集成、基础展示 | 可查看新闻列表 |
| **Phase 3** | AI集成、对话功能 | 可进行AI追问 |
| **Phase 4** | 完整功能、测试优化 | MVP v1.0 |

---

## 11. 风险和应对

| 风险 | 影响 | 应对措施 |
|-----|------|---------|
| NewsAPI免费额度用尽 | 新闻获取失败 | 准备RSS备用源 |
| 用户API Key失效 | AI功能不可用 | 明确提示用户更新Key |
| Claude API调用成本高 | 用户使用成本 | 提示用户消耗，支持本地模型 |
| 第三方API不稳定 | 服务不可用 | 多数据源冗余 |
| 新闻内容版权问题 | 法律风险 | 只展示摘要，原文跳转 |

---

## 12. 下一步行动

- [x] 技术栈确定
- [x] 系统架构设计
- [x] 数据库设计
- [x] API设计
- [x] 前端页面设计
- [ ] UI/UX原型设计
- [ ] 项目初始化
- [ ] 开始开发

---

**设计文档 v1.0 - 待确认后开始开发**
