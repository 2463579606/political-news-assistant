# 🚀 AI投资决策助手 - 部署指南

**版本**: v2.2
**更新日期**: 2026-02-25
**适用环境**: Linux/macOS/Windows

---

## 📋 目录

1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [快速开始](#快速开始)
4. [详细部署步骤](#详细部署步骤)
5. [生产环境部署](#生产环境部署)
6. [运维管理](#运维管理)
7. [故障排查](#故障排查)
8. [性能优化](#性能优化)

---

## 系统要求

### 最低配置

| 资源 | 最低要求 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Linux/macOS/Windows | Ubuntu 20.04+ / CentOS 7+ |
| **CPU** | 2核 | 4核+ |
| **内存** | 2GB | 4GB+ |
| **磁盘** | 10GB可用空间 | 50GB+ SSD |
| **网络** | 1Mbps | 10Mbps+ |

### 软件依赖

| 软件 | 最低版本 | 推荐版本 | 用途 |
|------|----------|----------|------|
| **Node.js** | v16.x | v18.20.8+ | 运行后端服务 |
| **PostgreSQL** | v12.x | v14.x+ | 数据存储 |
| **npm** | v8.x | v9.x+ | 包管理 |
| **PM2** (可选) | v5.x | v5.x+ | 进程管理 |
| **Nginx** (可选) | v1.18+ | v1.22+ | 反向代理 |

---

## 环境准备

### 1. 安装Node.js

#### Linux (Ubuntu/Debian)

```bash
# 使用NodeSource仓库安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### macOS

```bash
# 使用Homebrew安装
brew install node@18

# 验证安装
node --version
npm --version
```

#### Windows

下载并安装:
- 官网: https://nodejs.org/
- 下载LTS版本 (18.x)
- 安装时勾选"Add to PATH"

### 2. 安装PostgreSQL

#### Linux (Ubuntu/Debian)

```bash
# 安装PostgreSQL 14
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
sudo -u postgres psql --version
```

#### macOS

```bash
# 使用Homebrew安装
brew install postgresql@14

# 启动服务
brew services start postgresql@14

# 验证安装
psql --version
```

#### Windows

下载并安装:
- 官网: https://www.postgresql.org/download/windows/
- 下载安装程序
- 安装时设置密码 (记住此密码!)

### 3. 创建数据库

```bash
# 连接到PostgreSQL
sudo -u postgres psql  # Linux/macOS
# 或
psql -U postgres      # Windows

# 在PostgreSQL命令行中执行:
CREATE DATABASE investment_decision;
CREATE USER decision_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE investment_decision TO decision_user;
\q
```

---

## 快速开始

### 1. 克隆/获取项目代码

```bash
# 假设代码在以下目录
cd /path/to/political-news-assistant/src/backend
```

### 2. 安装依赖

```bash
npm install
```

**主要依赖**:
- `pg`: PostgreSQL客户端
- `ws`: WebSocket库
- `dotenv`: 环境变量管理
- `axios`: HTTP客户端 (用于Tushare API)

### 3. 配置环境变量

复制示例配置文件:

```bash
cp .env.example .env
```

编辑 `.env` 文件:

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=investment_decision
DB_USER=decision_user
DB_PASSWORD=your_secure_password

# Tushare API (可选 - 用于真实数据)
TUSHARE_TOKEN=your_tushare_token_here

# 服务端口
API_PORT=3001
V2_API_PORT=3002

# 日志级别
LOG_LEVEL=info
```

### 4. 初始化数据库

```bash
# 创建数据库表结构
node scripts/init-database.js

# 导入演示数据 (可选)
node scripts/seed-demo-data.js
```

### 5. 启动服务

```bash
# 启动v1 API服务器 (端口3001)
node simple-server.js &

# 启动v2 API服务器 (端口3002)
node server-v2.js &
```

### 6. 验证部署

```bash
# 测试v1健康检查
curl http://localhost:3001/health

# 测试v2健康检查
curl http://localhost:3002/api/v2/health

# 生成一个决策测试
curl -X POST http://localhost:3002/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{"stockCode":"000001.SZ"}'
```

---

## 详细部署步骤

### 步骤1: 项目结构说明

```
political-news-assistant/src/backend/
├── services/              # 核心服务层
│   ├── decision/         # 决策引擎
│   ├── backtest/         # 回测引擎
│   ├── monitoring/       # 监控服务
│   ├── cache/            # 缓存服务
│   ├── websocket/        # WebSocket服务
│   ├── scoring/          # 评分服务
│   └── database/         # 数据库服务
├── scripts/              # 工具脚本
│   ├── init-database.js  # 数据库初始化
│   ├── seed-demo-data.js # 演示数据
│   ├── performance-test.js  # 性能测试
│   └── test-websocket-client.js  # WebSocket测试
├── docs/                 # 文档目录
├── .env                  # 环境配置
├── simple-server.js      # v1 API服务器
├── server-v2.js          # v2 API服务器
└── package.json          # 依赖配置
```

### 步骤2: 数据库初始化详解

#### 2.1 创建数据库表结构

运行初始化脚本:

```bash
node scripts/init-database.js
```

这将创建12张表:

1. **市场数据表** (`market_data`)
2. **资金流向表** (`fund_flow`)
3. **新闻事件表** (`news_events`)
4. **决策记录表** (`decisions`)
5. **决策历史表** (`decision_history`)
6. **监控任务表** (`monitoring_tasks`)
7. **告警记录表** (`alerts`)
8. **回测任务表** (`backtests`)
9. **回测交易表** (`backtest_trades`)
10. **回测结果表** (`backtest_results`)
11. **系统日志表** (`system_logs`)
12. **系统配置表** (`system_config`)

#### 2.2 导入演示数据

```bash
node scripts/seed-demo-data.js
```

这将生成:
- 320条市场数据 (000001.SZ - 平安银行)
- 320条资金流向数据
- 5条新闻事件数据
- 数据覆盖范围: 2024-01-01 至 2024-05-20

#### 2.3 验证数据库

```bash
# 连接数据库
psql -U decision_user -d investment_decision

# 查看表
\dt

# 查看数据
SELECT COUNT(*) FROM market_data;
SELECT COUNT(*) FROM fund_flow;
SELECT COUNT(*) FROM news_events;

# 退出
\q
```

### 步骤3: 配置Tushare API (可选)

**什么是Tushare?**
- Tushare是中国最大的A股数据接口
- 提供真实、及时的股票行情数据
- 需要注册获取token

**获取Token**:
1. 访问: https://tushare.pro/register
2. 注册账号并登录
3. 进入"个人中心" → "接口TOKEN"
4. 复制token

**配置Token**:

编辑 `.env` 文件:

```env
TUSHARE_TOKEN=你的token_粘贴到这里
```

**测试Token**:

```bash
curl -X POST http://localhost:3002/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{"stockCode":"000001.SZ"}'
```

如果看到真实数据，说明配置成功！

### 步骤4: 启动服务详解

#### 4.1 开发环境启动

**方式1: 直接启动**

```bash
# 终端1 - 启动v1 API
node simple-server.js

# 终端2 - 启动v2 API
node server-v2.js
```

**方式2: 后台启动**

```bash
# 启动v1 API (后台运行)
nohup node simple-server.js > /tmp/v1-server.log 2>&1 &

# 启动v2 API (后台运行)
nohup node server-v2.js > /tmp/v2-server.log 2>&1 &

# 查看进程
ps aux | grep node

# 查看日志
tail -f /tmp/v1-server.log
tail -f /tmp/v2-server.log
```

#### 4.2 停止服务

```bash
# 查找进程ID
lsof -ti:3001  # v1 API端口
lsof -ti:3002  # v2 API端口

# 终止进程
kill <PID>

# 或强制终止
kill -9 <PID>
```

---

## 生产环境部署

### 1. 使用PM2进行进程管理

**安装PM2**:

```bash
npm install -g pm2
```

**创建PM2配置文件** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'investment-api-v1',
      script: './simple-server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/investment-v1-error.log',
      out_file: '/var/log/investment-v1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'investment-api-v2',
      script: './server-v2.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '/var/log/investment-v2-error.log',
      out_file: '/var/log/investment-v2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

**使用PM2启动**:

```bash
# 启动所有应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 查看详细信息
pm2 show investment-api-v1
pm2 show investment-api-v2

# 停止应用
pm2 stop all

# 重启应用
pm2 restart all

# 删除应用
pm2 delete all
```

**设置开机自启**:

```bash
# 保存当前PM2配置
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行输出的命令
# 例如: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your_user --hp /home/your_user
```

### 2. 配置Nginx反向代理

**安装Nginx**:

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# macOS
brew install nginx

# 启动Nginx
sudo systemctl start nginx  # Linux
brew services start nginx   # macOS
```

**创建配置文件** (`/etc/nginx/sites-available/investment-api`):

```nginx
# v1 API代理
server {
    listen 80;
    server_name api.yourdomain.com;

    # 日志
    access_log /var/log/nginx/investment-access.log;
    error_log /var/log/nginx/investment-error.log;

    # v1 API
    location /api/v1/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # v2 API
    location /api/v2/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket代理
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

**启用配置**:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/investment-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载Nginx
sudo systemctl reload nginx
```

### 3. SSL证书配置 (HTTPS)

**使用Let's Encrypt免费证书**:

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

**Nginx配置会自动更新为HTTPS**:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # ... 其他配置
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. 防火墙配置

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# CentOS firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

---

## 运维管理

### 1. 日志管理

#### 日志位置

```
/tmp/v1-server.log          # v1 API日志
/tmp/v2-server.log          # v2 API日志
/var/log/investment-v1-*.log  # PM2日志 (如使用PM2)
/var/log/nginx/investment-*.log  # Nginx日志 (如使用Nginx)
```

#### 日志查看

```bash
# 实时查看日志
tail -f /tmp/v2-server.log

# 查看最近100行
tail -n 100 /tmp/v2-server.log

# 搜索关键字
grep "ERROR" /tmp/v2-server.log

# PM2日志
pm2 logs --lines 100
```

#### 日志轮转

创建 `/etc/logrotate.d/investment-api`:

```
/tmp/v*-server.log /var/log/investment-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 2. 数据备份

#### 备份脚本 (`backup.sh`):

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/backup/investment"
DB_NAME="investment_decision"
DB_USER="decision_user"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env ecosystem.config.js

# 删除30天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**设置定时任务**:

```bash
# 编辑crontab
crontab -e

# 添加每天凌晨2点执行备份
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

#### 数据恢复

```bash
# 解压数据库备份
gunzip /backup/investment/db_20260225_020000.sql.gz

# 恢复数据库
psql -U decision_user investment_decision < /backup/investment/db_20260225_020000.sql
```

### 3. 性能监控

#### 系统资源监控

```bash
# CPU和内存使用
top
# 或
htop

# 磁盘使用
df -h

# 进程监控
ps aux | grep node

# 端口监听
netstat -tlnp | grep :3002
```

#### API性能监控

使用缓存统计API:

```bash
curl http://localhost:3002/api/v2/cache/stats
```

响应示例:

```json
{
  "success": true,
  "data": {
    "total": 15,
    "valid": 12,
    "expired": 3,
    "size": 45678
  }
}
```

#### WebSocket连接监控

```bash
curl http://localhost:3002/api/v2/websocket/stats
```

### 4. 健康检查

创建健康检查脚本 (`health-check.sh`):

```bash
#!/bin/bash

# 检查v1 API
curl -f http://localhost:3001/health || exit 1

# 检查v2 API
curl -f http://localhost:3002/api/v2/health || exit 1

# 检查数据库
psql -U decision_user -d investment_decision -c "SELECT 1" > /dev/null || exit 1

echo "All services healthy"
```

**设置定时检查**:

```bash
crontab -e

# 每5分钟检查一次
*/5 * * * * /path/to/health-check.sh
```

---

## 故障排查

### 常见问题

#### 问题1: 服务无法启动

**症状**: 执行 `node server-v2.js` 后立即退出

**排查步骤**:

```bash
# 1. 检查端口占用
lsof -ti:3002
# 如果有占用，使用 kill <PID> 释放端口

# 2. 检查环境变量
cat .env
# 确保所有必需变量都已配置

# 3. 检查数据库连接
psql -U decision_user -d investment_decision
# 无法连接说明数据库配置有误

# 4. 查看错误日志
node server-v2.js
# 查看控制台输出的错误信息
```

#### 问题2: 数据库连接失败

**症状**: `connect ECONNREFUSED 127.0.0.1:5432`

**解决方案**:

```bash
# 1. 检查PostgreSQL是否运行
sudo systemctl status postgresql

# 2. 启动PostgreSQL
sudo systemctl start postgresql

# 3. 检查数据库是否存在
psql -U postgres -l | grep investment_decision

# 4. 检查用户权限
psql -U postgres -c "\du" | grep decision_user

# 5. 验证密码
psql -U decision_user -d investment_decision
# 提示输入密码，验证是否正确
```

#### 问题3: 决策生成失败

**症状**: `{"success":false,"error":"无法获取市场数据"}`

**解决方案**:

```bash
# 1. 检查是否有演示数据
psql -U decision_user -d investment_decision -c "SELECT COUNT(*) FROM market_data"

# 2. 如果count为0，导入演示数据
node scripts/seed-demo-data.js

# 3. 验证数据
psql -U decision_user -d investment_decision -c "SELECT * FROM market_data LIMIT 5"

# 4. 检查Tushare配置 (如使用真实数据)
cat .env | grep TUSHARE_TOKEN
```

#### 问题4: WebSocket连接失败

**症状**: 客户端无法连接到 `ws://localhost:3002`

**解决方案**:

```bash
# 1. 检查v2服务器是否运行
curl http://localhost:3002/api/v2/health

# 2. 检查防火墙
sudo ufw status

# 3. 如果使用Nginx，检查WebSocket代理配置
sudo nginx -t

# 4. 测试WebSocket连接
node scripts/test-websocket-client.js
```

#### 问题5: 内存占用过高

**症状**: 系统运行缓慢，内存占用持续增长

**解决方案**:

```bash
# 1. 检查内存使用
free -h

# 2. 清空缓存
curl -X POST http://localhost:3002/api/v2/cache/clear

# 3. 重启服务
pm2 restart all

# 4. 如果问题持续，检查内存泄漏
node --inspect server-v2.js
# 然后使用Chrome DevTools进行内存分析
```

### 日志级别调整

编辑 `.env`:

```env
LOG_LEVEL=debug  # 开发环境
LOG_LEVEL=info   # 生产环境
LOG_LEVEL=error  # 只记录错误
```

---

## 性能优化

### 1. 数据库优化

#### 创建索引

```sql
-- 市场数据表索引
CREATE INDEX idx_market_stock_date ON market_data(stock_code, trade_date DESC);

-- 决策表索引
CREATE INDEX idx_decision_stock_time ON decisions(stock_code, decision_time DESC);

-- 回测表索引
CREATE INDEX idx_backtest_user ON backtests(created_by, created_at DESC);
```

#### 查询优化

```sql
-- 使用EXPLAIN分析查询
EXPLAIN ANALYZE
SELECT * FROM market_data
WHERE stock_code = '000001.SZ'
ORDER BY trade_date DESC
LIMIT 100;
```

### 2. 应用层优化

#### 启用集群模式

在 `ecosystem.config.js` 中:

```javascript
{
  instances: 'max',  // 使用所有CPU核心
  exec_mode: 'cluster'
}
```

#### 调整缓存TTL

编辑 `services/cache/cache-service.js`:

```javascript
// 根据业务需求调整
const TTL = {
  SHORT: 3 * 60 * 1000,      // 3分钟 (原来5分钟)
  MEDIUM: 10 * 60 * 1000,    // 10分钟 (原来15分钟)
  LONG: 30 * 60 * 1000,      // 30分钟 (原来1小时)
  VERY_LONG: 12 * 60 * 60 * 1000  // 12小时 (原来24小时)
};
```

### 3. 系统级优化

#### 调整文件描述符限制

```bash
# 临时调整
ulimit -n 65536

# 永久调整
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

#### 内核参数优化

编辑 `/etc/sysctl.conf`:

```
# 网络优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
```

应用配置:

```bash
sudo sysctl -p
```

---

## 安全建议

### 1. 环境变量保护

```bash
# 设置.env文件权限
chmod 600 .env

# 确保.gitignore包含.env
echo ".env" >> .gitignore
```

### 2. 数据库安全

```sql
-- 创建只读用户 (用于查询)
CREATE USER readonly_user WITH PASSWORD 'readonly_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- 定期修改密码
ALTER USER decision_user WITH PASSWORD 'new_secure_password';
```

### 3. API限流

使用Nginx限流:

```nginx
http {
    # 定义限流区域
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/ {
            # 应用限流
            limit_req zone=api_limit burst=20 nodelay;
            # ... 其他配置
        }
    }
}
```

### 4. 定期更新

```bash
# 更新系统依赖
npm update

# 检查安全漏洞
npm audit

# 修复安全问题
npm audit fix
```

---

## 附录

### A. 端口清单

| 端口 | 服务 | 说明 |
|------|------|------|
| 3001 | v1 API | 基础API服务 |
| 3002 | v2 API | 增强API服务 + WebSocket |
| 5432 | PostgreSQL | 数据库 |
| 80 | Nginx | HTTP (可选) |
| 443 | Nginx | HTTPS (可选) |

### B. 目录结构

```
/opt/investment-api/          # 生产环境推荐目录
├── src/                      # 源代码
├── logs/                     # 日志目录
├── backup/                   # 备份目录
├── scripts/                  # 工具脚本
├── .env                      # 环境配置
└── ecosystem.config.js       # PM2配置
```

### C. 有用的命令

```bash
# 快速重启所有服务
pm2 restart all

# 查看实时日志
pm2 logs --lines 100

# 清空缓存
curl -X POST http://localhost:3002/api/v2/cache/clear

# 查看WebSocket统计
curl http://localhost:3002/api/v2/websocket/stats

# 数据库备份
pg_dump -U decision_user investment_decision > backup.sql

# 数据库恢复
psql -U decision_user investment_decision < backup.sql

# 查看进程
ps aux | grep node

# 杀死指定端口进程
kill -9 $(lsof -ti:3002)
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-25
**维护者**: AI Investment Decision Team

如有问题或建议，请联系技术支持团队。
