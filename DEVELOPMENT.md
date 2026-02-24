# 时政新闻助手 - 开发指南

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (可选，用于缓存)
- NewsAPI Key (免费注册: https://newsapi.org/register)
- Anthropic API Key (用户自备)

### 1. 启动数据库

```bash
# 使用 Docker Compose
cd src/backend
docker-compose up -d postgres redis

# 或者手动启动
postgres # 确保 DATABASE_URL 正确
redis-server
```

### 2. 初始化数据库

```bash
cd src/backend
cp .env.example .env
# 编辑 .env 填入您的配置

npm run db:generate  # 生成迁移文件
npm run db:migrate  # 运行迁移
npm run db:init      # 初始化数据（分类、演示用户）
```

### 3. 启动后端服务

```bash
cd src/backend
npm run dev
```

后端将在 http://localhost:3001 启动

### 4. 启动前端服务

```bash
cd src/frontend
npm run dev
```

前端将在 http://localhost:3000 启动

### 5. 运行后台任务（可选）

```bash
# 抓取新闻
cd src/backend
npm run worker:fetch-news

# 生成每日简报
npm run worker:daily-brief
```

## 项目结构

```
src/
├── frontend/          # Next.js Web 应用
│   ├── app/         # App Router 页面
│   ├── components/  # React 组件
│   ├── lib/         # 工具和 API 客户端
│   └── stores/      # Zustand 状态管理
│
├── backend/           # Hono API 服务
│   ├── src/
│   │   ├── routes/     # API 路由
│   │   ├── services/   # 业务逻辑
│   │   ├── db/         # 数据库 Schema
│   │   ├── lib/        # 工具函数
│   │   └── workers/    # 后台任务
│   └── drizzle.config.ts
│
└── shared/            # 共享类型定义
    └── src/
        ├── types.ts    # TypeScript 类型
        └── schemas.ts  # Zod 验证 Schema
```

## API 端点

### 新闻
- `GET /api/v1/news` - 获取新闻列表
- `GET /api/v1/news/:id` - 获取新闻详情
- `GET /api/v1/news/daily/brief` - 获取每日简报
- `GET /api/v1/news/search` - 搜索新闻

### AI
- `POST /api/v1/ai/ask-news` - AI 对话
- `POST /api/v1/ai/summary/:id` - 生成摘要
- `GET /api/v1/ai/daily-brief` - AI 每日简报

### 用户
- `GET /api/v1/user/profile` - 用户信息
- `PUT /api/v1/user/api-key` - 设置 API Key
- `PUT /api/v1/user/preferences` - 更新偏好

## 环境变量

### 后端 (.env)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
NEWS_API_KEY=your_key_here
PORT=3001
CORS_ORIGIN=http://localhost:3000
ENCRYPTION_KEY=your_32_char_key
```

### 前端 (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 开发工作流

### 1. 添加新功能

1. 在 `shared/src/types.ts` 添加类型定义
2. 在 `shared/src/schemas.ts` 添加验证 Schema
3. 在 `backend/src/services/` 实现业务逻辑
4. 在 `backend/src/routes/` 添加 API 端点
5. 在 `frontend/src/lib/api-*.ts` 添加 API 客户端
6. 在 `frontend/src/stores/` 添加状态管理
7. 在 `frontend/src/components/` 创建 UI 组件

### 2. 数据库迁移

```bash
cd src/backend

# 修改 Schema 后
npm run db:generate  # 生成迁移 SQL
npm run db:migrate  # 执行迁移
```

### 3. 测试

```bash
# 后端测试
cd src/backend
npm test

# 前端测试
cd src/frontend
npm test
```

## 部署

### Vercel (前端)
```bash
cd src/frontend
vercel --prod
```

### Fly.io (后端)
```bash
cd src/backend
fly deploy
```

## 故障排除

### 问题: PostgreSQL 连接失败
- 确保 PostgreSQL 正在运行
- 检查 DATABASE_URL 是否正确
- 尝试: `psql $DATABASE_URL`

### 问题: Redis 连接失败
- Redis 是可选的，缓存禁用不影响核心功能
- 检查 REDIS_URL 配置

### 问题: NewsAPI 请求失败
- 检查 API Key 是否有效
- 免费版有 100 请求/天 限制
- 查看控制台错误信息

### 问题: AI 功能不可用
- 用户需要在设置中配置自己的 Claude API Key
- 确保 Key 格式: `sk-ant-...`
- 检查 Key 是否有余额

## 扩展性设计

### 添加新数据源
编辑 `src/backend/src/lib/config.ts`:
```typescript
export const NEWS_SOURCES = {
  newsapi: { ... },
  yournewsource: {
    name: 'Your Source',
    enabled: true,
    priority: 2,
    baseUrl: 'https://api.example.com',
    apiKey: process.env.YOUR_API_KEY,
  },
};
```

### 添加新 AI 模型
编辑 `src/backend/src/lib/config.ts`:
```typescript
export const AI_CONFIG = {
  anthropic: { ... },
  yourmodel: {
    provider: 'custom' as const,
    model: 'your-model-name',
  },
};
```

## 许可证

ISC
