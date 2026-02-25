/**
 * Monitoring API Routes
 * 监控API路由
 *
 * 提供系统监控相关接口
 */

const express = require('express');
const router = express.Router();
const MonitoringService = require('../services/monitoring/monitoring-service');

const monitoringService = new MonitoringService();

/**
 * GET /api/v2/monitoring/status
 * 获取监控状态
 */
router.get('/status', async (req, res) => {
  try {
    console.log(`📊 获取监控状态`);

    const status = await monitoringService.getMonitoringStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('获取监控状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/health
 * 获取健康检查
 */
router.get('/health', async (req, res) => {
  try {
    const status = await monitoringService.getMonitoringStatus();

    // 根据健康度返回不同的状态码
    const healthScore = status.health.score;
    let statusCode = 200;

    if (healthScore < 40) {
      statusCode = 503; // Service Unavailable
    } else if (healthScore < 60) {
      statusCode = 200; // OK but with warnings
    }

    res.status(statusCode).json({
      success: true,
      data: {
        healthy: healthScore >= 60,
        score: healthScore,
        level: status.health.level,
        timestamp: status.timestamp
      }
    });

  } catch (error) {
    console.error('健康检查失败:', error.message);
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/data
 * 获取数据监控状态
 */
router.get('/data', async (req, res) => {
  try {
    console.log(`📊 获取数据监控状态`);

    const dataStatus = await monitoringService.checkDataStatus();

    res.json({
      success: true,
      data: dataStatus
    });

  } catch (error) {
    console.error('获取数据监控状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/system
 * 获取系统监控状态
 */
router.get('/system', async (req, res) => {
  try {
    console.log(`📊 获取系统监控状态`);

    const systemStatus = await monitoringService.checkSystemStatus();

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    console.error('获取系统监控状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/business
 * 获取业务监控状态
 */
router.get('/business', async (req, res) => {
  try {
    console.log(`📊 获取业务监控状态`);

    const businessStatus = await monitoringService.checkBusinessStatus();

    res.json({
      success: true,
      data: businessStatus
    });

  } catch (error) {
    console.error('获取业务监控状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/alerts
 * 获取告警历史
 *
 * Query:
 *   level: 告警级别 (可选)
 *   limit: 返回条数 (默认50)
 */
router.get('/alerts', async (req, res) => {
  try {
    const { level, limit = 50 } = req.query;

    console.log(`📊 获取告警历史`);

    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    let query = `
      SELECT * FROM monitoring_alerts
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (level) {
      query += ` AND level = $${paramIndex++}`;
      params.push(level);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const result = await pool.query(query, params);
    await pool.end();

    res.json({
      success: true,
      data: {
        total: result.rows.length,
        alerts: result.rows
      }
    });

  } catch (error) {
    console.error('获取告警历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/report/daily
 * 获取日报
 */
router.get('/report/daily', async (req, res) => {
  try {
    console.log(`📊 生成日报`);

    const report = await monitoringService.generateMonitoringReport('daily');

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('生成日报失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/monitoring/report/weekly
 * 获取周报
 */
router.get('/report/weekly', async (req, res) => {
  try {
    console.log(`📊 生成周报`);

    const report = await monitoringService.generateMonitoringReport('weekly');

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('生成周报失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/monitoring/test-alert
 * 测试告警（用于验证告警系统）
 */
router.post('/test-alert', async (req, res) => {
  try {
    const { level = 'INFO', type = 'TEST', message = '这是一条测试告警' } = req.body;

    console.log(`🧪 测试告警`);

    const alert = monitoringService.createAlert(level, type, message, {
      test: true,
      triggeredBy: 'API'
    });

    res.json({
      success: true,
      data: {
        message: '测试告警已创建',
        alert: alert
      }
    });

  } catch (error) {
    console.error('创建测试告警失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
