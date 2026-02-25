# AI投资决策助手 v2.0 - 部署文档

## 目录
1. [系统要求](#系统要求)
2. [安装部署](#安装部署)
3. [配置说明](#配置说明)
4. [数据初始化](#数据初始化)
5. [服务启动](#服务启动)
6. [验证部署](#验证部署)
7. [常见问题](#常见问题)

---

## 1. 系统要求

### 1.1 硬件要求

**最小配置**:
- CPU: 2核
- 内存: 4GB
- 硬盘: 50GB SSD

**推荐配置**:
- CPU: 4核+
- 内存: 8GB+
- 硬盘: 100GB SSD

### 1.2 软件要求

- **操作系统**: Ubuntu 20.04+ / macOS 12+ / Windows 10+
- **Node.js**: v18.0.0+
- **PostgreSQL**: 14.0+
- **Redis**: 6.0+ (可选，用于缓存)
- **Git**: 2.0+

### 1.3 第三方服务

- **Tushare**: A股数据源（需要token）
- **ChromaDB**: 向量数据库
- **OpenAI API**: GPT模型（可选）

---

## 2. 安装部署

### 2.1 克隆代码

```bash
# 克隆仓库
git clone <repository-url>
cd political-news-assistant

# 切换到最新版本分支
git checkout develop
```

### 2.2 安装依赖

```bash
# 进入后端目录
cd src/backend

# 安装Node.js依赖
npm install

# 或使用yarn
yarn install
```

### 2.3 安装PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Windows
下载并安装: https://www.postgresql.org/download/windows/

### 2.4 创建数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 或直接连接
psql -U postgres

# 创建数据库和用户
CREATE DATABASE political_news;
CREATE USER political_news_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE political_news TO political_news_user;
\q
```

### 2.5 安装ChromaDB（可选）

```bash
# 使用pip安装
pip install chromadb

# 或使用Docker
docker run -p 8000:8000 chromadb/chroma
```

---

## 3. 配置说明

### 3.1 环境变量配置

创建 `.env` 文件：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置
vim .env
```

### 3.2 配置项说明

```bash
# ==================== 数据库配置 ====================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=political_news
POSTGRES_USER=political_news_user
POSTGRES_PASSWORD=your_secure_password

# ==================== Redis配置（可选）====================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ==================== API配置 ====================
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=production

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE=logs/app.log

# ==================== 第三方服务 ====================
# Tushare（A股数据）
TUSHARE_TOKEN=your_tushare_token

# OpenAI（GPT模型，可选）
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# ==================== 向量数据库 ====================
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# ==================== 交易成本配置 ====================
DEFAULT_COMMISSION_RATE=0.0003  # 手续费率 0.03%
DEFAULT_SLIPPAGE_RATE=0.001      # 滑点率 0.1%

# ==================== 风控配置 ====================
DEFAULT_MAX_POSITION=0.3         # 最大仓位 30%
DEFAULT_STOP_LOSS=-0.08          # 止损 -8%
DEFAULT_TAKE_PROFIT=0.15         # 止盈 +15%

# ==================== 监控配置 ====================
# 邮件告警（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
ALERT_TO=alerts@example.com

# Webhook告警（可选）
WEBHOOK_URL=https://hooks.example.com/webhook
```

---

## 4. 数据初始化

### 4.1 运行数据库迁移

```bash
# 进入后端目录
cd src/backend

# 运行所有迁移脚本
node migrations/001_create_initial_tables.js
node migrations/002_create_decision_tables.js
node migrations/003_create_backtest_tables.js
node migrations/004_create_monitoring_tables.js
```

### 4.2 验证数据库表

```bash
psql -U political_news_user -d political_news -c "\dt"

# 应该看到以下表:
# - market_data
# - fund_flow
# - news_events
# - news_vectors
# - decisions
# - decision_history
# - backtest_results
# - backtest_trades
# - backtest_optimizations
# - backtest_summary
# - monitoring_alerts
# - monitoring_metrics
# - monitoring_performance
# - monitoring_data_updates
```

### 4.3 初始化测试数据（可选）

```bash
# 创建测试市场数据
node scripts/create-test-market-data.js
```

---

## 5. 服务启动

### 5.1 开发模式

```bash
# 启动开发服务器（支持热重载）
npm run dev

# 或直接启动
node index.js
```

### 5.2 生产模式

#### 使用PM2（推荐）

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start index.js --name ai-investment-assistant

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-investment-assistant

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用Systemd

创建服务文件 `/etc/systemd/system/ai-investment-assistant.service`:

```ini
[Unit]
Description=AI Investment Assistant v2.0
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/political-news-assistant/src/backend
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl start ai-investment-assistant
sudo systemctl enable ai-investment-assistant
sudo systemctl status ai-investment-assistant
```

### 5.3 Docker部署（可选）

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: political_news
      POSTGRES_USER: political_news_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  chromadb:
    image: chromadb/chroma
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
      - CHROMADB_HOST=chromadb
    depends_on:
      - postgres
      - redis
      - chromadb
    restart: always

volumes:
  postgres_data:
  redis_data:
  chromadb_data:
```

启动:

```bash
docker-compose up -d
```

---

## 6. 验证部署

### 6.1 健康检查

```bash
# 检查API健康
curl http://localhost:3000/health

# 应返回:
# {
#   "status": "ok",
#   "timestamp": "...",
#   "service": "AI Investment Assistant v2.0"
# }
```

### 6.2 测试核心功能

```bash
# 测试生成决策
curl -X POST http://localhost:3000/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{"stockCode": "000001.SZ"}'

# 测试回测
curl -X POST http://localhost:3000/api/v2/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'

# 测试监控
curl http://localhost:3000/api/v2/monitoring/status
```

### 6.3 查看日志

```bash
# PM2
pm2 logs ai-investment-assistant

# Systemd
sudo journalctl -u ai-investment-assistant -f

# Docker
docker-compose logs -f app
```

---

## 7. 常见问题

### 7.1 数据库连接失败

**问题**: `connection refused` 或 `password authentication failed`

**解决**:
1. 检查PostgreSQL是否运行: `sudo systemctl status postgresql`
2. 检查用户名密码是否正确
3. 检查 `pg_hba.conf` 配置:
   ```bash
   sudo vim /etc/postgresql/14/main/pg_hba.conf
   # 添加: host all all 127.0.0.1/32 md5
   sudo systemctl restart postgresql
   ```

### 7.2 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use`

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改API_PORT环境变量
```

### 7.3 内存不足

**问题**: `JavaScript heap out of memory`

**解决**:
```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 index.js
```

### 7.4 数据更新延迟

**问题**: 监控显示数据延迟

**解决**:
1. 检查TUSHARE_TOKEN是否正确配置
2. 检查网络连接
3. 手动触发数据更新: `npm run update:data`

### 7.5 ChromaDB连接失败

**问题**: 无法连接到向量数据库

**解决**:
1. 检查ChromaDB是否运行: `docker ps | grep chroma`
2. 检查端口配置: `CHROMADB_HOST` 和 `CHROMADB_PORT`
3. 如不使用向量检索，可以在代码中跳过该功能

---

## 8. 维护和监控

### 8.1 日常维护

```bash
# 查看服务状态
curl http://localhost:3000/api/v2/monitoring/status

# 查看告警历史
curl http://localhost:3000/api/v2/monitoring/alerts?limit=20

# 生成日报
curl http://localhost:3000/api/v2/monitoring/report/daily
```

### 8.2 数据备份

```bash
# 备份数据库
pg_dump -U political_news_user political_news > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U political_news_user political_news < backup_20240225.sql
```

### 8.3 日志清理

```bash
# 清理旧日志（保留最近30天）
find logs/ -name "*.log" -mtime +30 -delete

# 或使用logrotate
```

### 8.4 性能优化

```bash
# 数据库清理
psql -U political_news_user -d political_news -c "VACUUM ANALYZE;"

# 重建索引
psql -U political_news_user -d political_news -c "REINDEX DATABASE political_news;"
```

---

## 9. 升级部署

### 9.1 备份数据

```bash
# 备份数据库
pg_dump -U political_news_user political_news > backup_before_upgrade.sql

# 备份配置文件
cp .env .env.backup
```

### 9.2 拉取最新代码

```bash
git fetch origin
git checkout develop
git pull origin develop
```

### 9.3 安装依赖和迁移

```bash
cd src/backend
npm install

# 运行新的迁移（如果有）
node migrations/00x_new_migration.js
```

### 9.4 重启服务

```bash
# PM2
pm2 restart ai-investment-assistant

# Systemd
sudo systemctl restart ai-investment-assistant

# Docker
docker-compose down
docker-compose up -d
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**作者**: Claude Code
