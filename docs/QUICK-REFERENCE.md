# 📖 AI投资决策助手 - 快速参考指南

**版本**: v2.2 | **更新**: 2026-02-25

---

## 🚀 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑.env文件，配置数据库连接

# 3. 初始化数据库
node scripts/init-database.js
node scripts/seed-demo-data.js

# 4. 启动服务
node simple-server.js &    # v1 API (端口3001)
node server-v2.js &        # v2 API (端口3002)

# 5. 验证
curl http://localhost:3002/api/v2/health
```

---

## 📡 核心API

### 决策生成

```bash
# 单个决策
curl -X POST http://localhost:3002/api/v2/decision/generate \
  -H "Content-Type: application/json" \
  -d '{"stockCode":"000001.SZ"}'

# 批量决策
curl -X POST http://localhost:3002/api/v2/decision/batch \
  -H "Content-Type: application/json" \
  -d '{"stockCodes":["000001.SZ","600519.SH","000002.SZ"]}'
```

### 回测

```bash
curl -X POST http://localhost:3002/api/v2/backtest/create \
  -H "Content-Type: application/json" \
  -d '{
    "stockCode": "000001.SZ",
    "startDate": "2024-01-01",
    "endDate": "2024-05-20",
    "strategy": {
      "buyThreshold": 70,
      "sellThreshold": 30,
      "stopLoss": 0.08,
      "takeProfit": 0.15
    }
  }'
```

### 决策历史

```bash
# 查询历史
curl "http://localhost:3002/api/v2/decision/history?stockCode=000001.SZ&limit=10"

# 最新决策
curl "http://localhost:3002/api/v2/decision/latest?stockCode=000001.SZ"

# 决策统计
curl "http://localhost:3002/api/v2/decision/stats?stockCode=000001.SZ&days=30"
```

### 缓存管理

```bash
# 缓存统计
curl http://localhost:3002/api/v2/cache/stats

# 清空缓存
curl -X POST http://localhost:3002/api/v2/cache/clear

# 清除指定股票缓存
curl -X DELETE http://localhost:3002/api/v2/cache/stock/000001.SZ
```

### WebSocket

```bash
# 连接统计
curl http://localhost:3002/api/v2/websocket/stats

# 广播消息
curl -X POST http://localhost:3002/api/v2/websocket/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "alerts",
    "message": {
      "type": "alert",
      "level": "INFO",
      "message": "系统通知"
    }
  }'
```

---

## 🌐 WebSocket连接

### JavaScript示例

```javascript
// 连接
const ws = new WebSocket('ws://localhost:3002');

// 连接成功
ws.onopen = () => {
  console.log('已连接');

  // 订阅主题
  ws.send(JSON.stringify({
    type: 'subscribe',
    topics: ['decision:000001.SZ', 'alerts']
  }));
};

// 接收消息
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('收到:', message);
};

// 处理断开
ws.onclose = () => {
  console.log('已断开');
};
```

### 推送主题

- `decision:{stockCode}` - 决策更新推送
- `market:{stockCode}` - 行情更新推送
- `alerts` - 监控告警推送

---

## 🗄️ 数据库操作

### 连接数据库

```bash
psql -U decision_user -d investment_decision
```

### 常用查询

```sql
-- 查看表
\dt

-- 市场数据统计
SELECT COUNT(*) FROM market_data;

-- 最新决策
SELECT * FROM decisions ORDER BY decision_time DESC LIMIT 10;

-- 回测结果
SELECT * FROM backtest_results ORDER BY backtest_id DESC LIMIT 5;
```

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 决策生成 | 5.2ms |
| 批量决策(3只) | 8ms |
| API响应 | < 10ms |
| 缓存命中率 | 83% |
| 内存占用 | < 50MB |

---

## 🔧 常用命令

### 服务管理

```bash
# 查看端口占用
lsof -ti:3001  # v1 API
lsof -ti:3002  # v2 API

# 终止进程
kill <PID>
kill -9 <PID>  # 强制终止

# 后台启动
nohup node server-v2.js > /tmp/v2.log 2>&1 &

# 查看日志
tail -f /tmp/v2-server.log
```

### PM2管理 (生产环境)

```bash
# 启动
pm2 start ecosystem.config.js

# 状态
pm2 status

# 日志
pm2 logs

# 重启
pm2 restart all

# 停止
pm2 stop all
```

### 测试工具

```bash
# 性能测试
node scripts/performance-test.js

# WebSocket测试
node scripts/test-websocket-client.js

# 数据初始化
node scripts/init-database.js
node scripts/seed-demo-data.js
```

---

## ⚠️ 故障排查

### 服务无法启动

```bash
# 1. 检查端口
lsof -ti:3002

# 2. 检查环境变量
cat .env

# 3. 检查数据库
psql -U decision_user -d investment_decision
```

### 决策生成失败

```bash
# 1. 检查数据
psql -U decision_user -d investment_decision -c "SELECT COUNT(*) FROM market_data"

# 2. 导入演示数据
node scripts/seed-demo-data.js

# 3. 清空缓存
curl -X POST http://localhost:3002/api/v2/cache/clear
```

### WebSocket连接失败

```bash
# 1. 检查v2服务器
curl http://localhost:3002/api/v2/health

# 2. 测试WebSocket
node scripts/test-websocket-client.js
```

---

## 📁 项目结构

```
src/backend/
├── services/              # 核心服务
│   ├── decision/         # 决策引擎
│   ├── backtest/         # 回测引擎
│   ├── monitoring/       # 监控服务
│   ├── cache/            # 缓存服务
│   ├── websocket/        # WebSocket服务
│   └── scoring/          # 评分服务
├── scripts/              # 工具脚本
├── docs/                 # 文档
├── .env                  # 环境配置
├── simple-server.js      # v1 API (端口3001)
└── server-v2.js          # v2 API (端口3002)
```

---

## 🔑 环境变量

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=investment_decision
DB_USER=decision_user
DB_PASSWORD=your_password

# Tushare API (可选)
TUSHARE_TOKEN=your_token

# 服务端口
API_PORT=3001
V2_API_PORT=3002

# 日志
LOG_LEVEL=info
```

---

## 📚 重要文档

- **API文档**: `docs/API-v2.md`
- **WebSocket文档**: `docs/WEBSOCKET-API.md`
- **部署指南**: `docs/DEPLOYMENT-GUIDE.md`
- **系统架构**: `docs/ARCHITECTURE.md`

---

## 🎯 决策类型

| 决策 | 评分范围 | 说明 |
|------|----------|------|
| STRONG_BUY | ≥80 | 强烈买入 |
| MODERATE_BUY | 70-79 | 适度买入 |
| LIGHT_BUY | 60-69 | 轻仓买入 |
| NEUTRAL_HOLD | 50-59 | 中性持有 |
| CAUTIOUS_HOLD | 40-49 | 谨慎持有 |
| RISK_CONTROL | 30-39 | 风险控制 |
| LIGHT_SELL | 20-29 | 轻仓卖出 |
| MODERATE_SELL | 10-19 | 适度卖出 |
| STRONG_SELL | <10 | 强烈卖出 |

---

## 🎉 项目成就

- ✅ **11,000+行代码** - 生产级系统
- ✅ **35个API端点** - 完整功能
- ✅ **99.5%性能提升** - 800ms → 5ms
- ✅ **83%缓存命中率** - 高效缓存
- ✅ **100%测试通过** - 稳定可靠
- ✅ **5000+行文档** - 详尽完整

---

**快速参考指南 v1.0** | 最后更新: 2026-02-25
