/**
 * 测试API服务器
 * 用于测试v2版本的API接口
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 导入路由
const marketV2Routes = require('./routes/market-v2');
const fundFlowV2Routes = require('./routes/fund-flow-v2');

const app = express();
const PORT = 3002; // 使用不同端口避免冲突

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API路由
app.use('/api/v2/market', marketV2Routes);
app.use('/api/v2/fund-flow', fundFlowV2Routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Test API Server v2'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: 'AI智能投资决策助手 API v2',
    version: '2.0.0',
    endpoints: {
      health: 'GET /health',
      market: '/api/v2/market/*'
    }
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 测试API服务器启动成功                               ║
╠════════════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                          ║
║  版本: v2.0.0                                          ║
║                                                        ║
║  可用接口:                                              ║
║  - GET  /health                                       ║
║  - GET  /                                             ║
║  - GET  /api/v2/market/test                           ║
║  - GET  /api/v2/market/stock/:code/kline              ║
║  - POST /api/v2/market/stock/:code/update             ║
║  - POST /api/v2/market/batch-update                   ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
