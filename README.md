# 时政新闻助手 (Political News Assistant)

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.9.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**智能时政新闻聚合与AI助手平台**

一个专注于时政、财经、政治新闻的智能聚合平台，提供AI驱动的新闻摘要、智能分析和个性化推荐。

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [API文档](#-api文档)

</div>

---

## 📋 项目概述

时政新闻助手是一个全栈Web应用，旨在帮助用户：

- **高效获取信息** - 整合多个时政新闻源，一站式获取关键信息
- **智能过滤** - 自动过滤娱乐类信息，专注核心内容
- **AI深度分析** - 每日时政要闻智能归纳，支持对话式追问
- **个性化体验** - 用户认证、收藏、历史记录等功能

### 技术栈

**前端**
- Next.js 15 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Zustand (状态管理)

**后端**
- Node.js
- Express-style HTTP server
- JWT认证
- PostgreSQL (可选，生产环境推荐)
- Anthropic Claude API (AI功能)

---

## ✨ 功能特性

### 核心功能

- ✅ **新闻聚合展示** - 多源新闻聚合，支持分类浏览（时政、财经、科技、国际）
- ✅ **智能搜索** - 支持中英文关键词搜索，实时过滤
- ✅ **AI每日简报** - 自动生成每日时政要闻摘要
- ✅ **AI对话助手** - 支持自然语言追问，深度分析新闻话题
- ✅ **用户认证系统** - 注册、登录、JWT令牌验证
- ✅ **个人中心** - 用户资料、阅读统计、收藏管理
- ✅ **通知设置** - 每日简报推送时间自定义
- ✅ **响应式设计** - 完美支持桌面和移动设备

### 高级功能（开发中）

- 🔜 **实时新闻推送** - WebSocket实时更新
- 🔜 **邮件订阅** - 每日简报邮件推送
- 🔜 **深度数据挖掘** - 话题趋势分析
- 🔜 **多语言支持** - 国际版内容
- 🔜 **桌面应用** - Tauri打包的跨平台桌面客户端

---

## 🚀 快速开始

### 前置要求

- **Node.js**: >= 20.9.0 (必需)
- **PostgreSQL**: >= 13 (可选，开发环境可用内存数据库)
- **npm** 或 **yarn**

### 安装与运行

1. **克隆项目**
```bash
git clone <repository-url>
cd political-news-assistant
```

2. **后端设置**
```bash
cd src/backend
npm install
node simple-server.js
```
后端将运行在 `http://localhost:3001`

3. **前端设置**
```bash
cd src/frontend
npm install
npm run dev
```
前端将运行在 `http://localhost:3000`

4. **访问应用**
打开浏览器访问 `http://localhost:3000`

### Docker 部署（推荐）

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 📡 API文档

### 认证相关

#### 注册用户
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 201:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### 用户登录
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### 验证令牌
```http
GET /api/v1/auth/me
Authorization: Bearer <token>

Response 200:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### 新闻相关

#### 获取所有新闻
```http
GET /api/v1/news

Response 200:
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### 搜索新闻
```http
GET /api/v1/news/search?q=关键词

Response 200:
{
  "data": [...]
}
```

#### 分类筛选
```http
GET /api/v1/news?category=business

Response 200:
{
  "data": [...],
  "pagination": {...}
}
```

#### 新闻详情
```http
GET /api/v1/news/:id

Response 200:
{
  "id": "1",
  "title": "新闻标题",
  "description": "描述",
  "category": "财经"
}
```

### AI功能

#### 获取每日简报
```http
GET /api/v1/ai/daily-brief

Response 200:
{
  "date": "2026-02-15",
  "brief": {
    "summary": "摘要内容",
    "keyPoints": [...],
    "importance": "高"
  }
}
```

#### AI对话
```http
POST /api/v1/ai/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "今天有哪些重要新闻？"
}

Response 200:
{
  "response": "AI回复内容"
}
```

---

## 🏗️ 项目结构

```
political-news-assistant/
├── docs/                      # 文档目录
│   ├── prd/                  # 产品需求文档
│   ├── design/               # 设计文档
│   └── tests/                # 测试文档
├── src/
│   ├── backend/              # 后端服务
│   │   ├── simple-server.js  # 主服务器文件
│   │   ├── auth-service.js   # 认证服务
│   │   ├── db.js            # 数据库配置
│   │   ├── claude-service.js # AI服务
│   │   └── package.json
│   └── frontend/            # 前端应用
│       ├── app/             # Next.js App Router
│       │   ├── page.tsx    # 首页
│       │   ├── auth/       # 认证页面
│       │   ├── settings/   # 设置页面
│       │   └── profile/    # 个人中心
│       ├── components/      # React组件
│       ├── lib/           # 工具库
│       └── package.json
├── DEPLOYMENT.md          # 部署指南
├── DEVELOPMENT.md        # 开发指南
└── README.md           # 本文件
```

---

## ⚙️ 配置说明

### 后端环境变量 (.env)

```bash
# 服务器配置
NODE_ENV=development
PORT=3001

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/political_news

# JWT密钥（生产环境必须更改）
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRY=7d

# Claude API（AI功能）
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 前端环境变量 (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🧪 测试

### 运行测试套件

```bash
# 后端E2E测试
cd src/backend
node test-all-endpoints.mjs

# 单独测试认证
node test-auth.mjs
```

### 测试覆盖

当前测试覆盖：
- ✅ 健康检查
- ✅ 新闻列表、搜索、分类筛选
- ✅ 用户注册、登录、令牌验证
- ✅ AI每日简报、对话
- ✅ 错误处理（重复注册、错误密码、无效令牌）
- ✅ CORS配置

---

## 📦 部署指南

详细部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署（生产环境）

1. **准备服务器**（Ubuntu 20.04+推荐）
```bash
# 安装Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PostgreSQL
sudo apt-get install postgresql postgresql-contrib
```

2. **配置环境变量**
```bash
# 后端
cd src/backend
cp .env.example .env
# 编辑 .env 文件设置生产环境变量
```

3. **使用PM2部署**
```bash
# 安装PM2
npm install -g pm2

# 启动后端
cd src/backend
pm2 start simple-server.js --name political-news-backend

# 启动前端
cd src/frontend
npm run build
pm2 start npm --name political-news-frontend -- start

# 保存配置
pm2 save
pm2 startup
```

4. **配置Nginx反向代理**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

## 🐛 故障排除

### 常见问题

**Q: 后端启动失败**
```bash
# 检查端口占用
lsof -i :3001

# 查看错误日志
pm2 logs political-news-backend
```

**Q: 前端构建失败**
```bash
# 检查Node版本
node --version  # 必须 >= 20.9.0

# 清除缓存
rm -rf .next node_modules
npm install
npm run build
```

**Q: 数据库连接失败**
```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 测试连接
psql -U postgres -c "SELECT version();"
```

---

## 📈 性能优化

- ✅ 服务端渲染（SSR）提升首屏加载速度
- ✅ API响应缓存减少数据库查询
- ✅ 图片懒加载优化带宽使用
- ✅ 代码分割减少初始包大小
- 🔜 CDN加速静态资源
- 🔜 Redis缓存热点数据

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- **项目主页**: [GitHub Repository](#)
- **问题反馈**: [Issues](#)
- **文档**: [完整文档](./docs/)

---

<div align="center">

**Made with ❤️ for efficient news consumption**

[⬆ 回到顶部](#时政新闻助手-political-news-assistant)

</div>
