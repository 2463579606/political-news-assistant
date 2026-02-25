/**
 * Monitoring Service
 * 监控服务
 *
 * 功能:
 * 1. 数据更新监控
 * 2. 系统性能监控
 * 3. 业务指标监控
 * 4. 告警通知
 */

const { Pool } = require('pg');

class MonitoringService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 监控配置
    this.config = {
      // 数据更新阈值（分钟）
      dataUpdateThreshold: {
        marketData: 60,       // 市场数据 1小时
        fundFlow: 60,         // 资金流向 1小时
        newsEvents: 180,      // 新闻 3小时
      },
      // API性能阈值（毫秒）
      apiPerformanceThreshold: {
        p50: 100,
        p95: 500,
        p99: 1000
      },
      // 错误率阈值
      errorRateThreshold: 0.05  // 5%
    };

    // 告警历史
    this.alertHistory = [];
  }

  /**
   * 获取监控状态
   */
  async getMonitoringStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      data: await this.checkDataStatus(),
      system: await this.checkSystemStatus(),
      business: await this.checkBusinessStatus(),
      alerts: this.getRecentAlerts(10)
    };

    // 计算整体健康度
    status.health = this.calculateHealthScore(status);

    return status;
  }

  /**
   * 检查数据状态
   */
  async checkDataStatus() {
    const checks = {
      marketData: await this.checkMarketDataFreshness(),
      fundFlow: await this.checkFundFlowFreshness(),
      newsEvents: await this.checkNewsEventsFreshness(),
      database: await this.checkDatabaseStatus()
    };

    // 整体数据状态
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'warning',
      checks: checks
    };
  }

  /**
   * 检查市场数据新鲜度
   */
  async checkMarketDataFreshness() {
    const query = `
      SELECT
        MAX(trade_date) as latest_date,
        COUNT(*) as total_records,
        COUNT(DISTINCT stock_code) as stock_count
      FROM market_data
      WHERE trade_date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      if (!row.latest_date) {
        return {
          type: 'market_data',
          status: 'error',
          message: '没有市场数据',
          latestDate: null,
          hoursSinceUpdate: null
        };
      }

      const latestDate = new Date(row.latest_date);
      const now = new Date();
      const hoursSince = Math.floor((now - latestDate) / (1000 * 60 * 60));

      const isHealthy = hoursSince <= this.config.dataUpdateThreshold.marketData / 60;

      return {
        type: 'market_data',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy ? '数据正常' : `数据延迟${hoursSince}小时`,
        latestDate: row.latest_date,
        hoursSinceUpdate: hoursSince,
        totalRecords: row.total_records,
        stockCount: row.stock_count
      };

    } catch (error) {
      return {
        type: 'market_data',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查资金流向新鲜度
   */
  async checkFundFlowFreshness() {
    const query = `
      SELECT
        MAX(trade_date) as latest_date,
        COUNT(*) as total_records,
        COUNT(DISTINCT stock_code) as stock_count
      FROM fund_flow
      WHERE trade_date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      if (!row.latest_date) {
        return {
          type: 'fund_flow',
          status: 'error',
          message: '没有资金流向数据',
          latestDate: null,
          hoursSinceUpdate: null
        };
      }

      const latestDate = new Date(row.latest_date);
      const now = new Date();
      const hoursSince = Math.floor((now - latestDate) / (1000 * 60 * 60));

      const isHealthy = hoursSince <= this.config.dataUpdateThreshold.fundFlow / 60;

      return {
        type: 'fund_flow',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy ? '数据正常' : `数据延迟${hoursSince}小时`,
        latestDate: row.latest_date,
        hoursSinceUpdate: hoursSince,
        totalRecords: row.total_records,
        stockCount: row.stock_count
      };

    } catch (error) {
      return {
        type: 'fund_flow',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查新闻事件新鲜度
   */
  async checkNewsEventsFreshness() {
    const query = `
      SELECT
        MAX(created_at) as latest_date,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') as today_events
      FROM news_events
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      if (!row.latest_date) {
        return {
          type: 'news_events',
          status: 'warning',
          message: '没有新闻事件',
          latestDate: null,
          hoursSinceUpdate: null
        };
      }

      const latestDate = new Date(row.latest_date);
      const now = new Date();
      const hoursSince = Math.floor((now - latestDate) / (1000 * 60 * 60));

      const isHealthy = hoursSince <= this.config.dataUpdateThreshold.newsEvents / 60;

      return {
        type: 'news_events',
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy ? '数据正常' : `数据延迟${hoursSince}小时`,
        latestDate: row.latest_date,
        hoursSinceUpdate: hoursSince,
        totalEvents: row.total_events,
        todayEvents: row.today_events
      };

    } catch (error) {
      return {
        type: 'news_events',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查数据库状态
   */
  async checkDatabaseStatus() {
    try {
      // 测试查询
      await this.pool.query('SELECT 1');

      // 检查连接数
      const connResult = await this.pool.query(`
        SELECT count(*) as connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // 检查数据库大小
      const sizeResult = await this.pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      return {
        type: 'database',
        status: 'healthy',
        message: '数据库正常',
        connections: connResult.rows[0].connections,
        size: sizeResult.rows[0].size
      };

    } catch (error) {
      return {
        type: 'database',
        status: 'error',
        message: `数据库异常: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查系统状态
   */
  async checkSystemStatus() {
    const checks = {
      memory: this.checkMemoryUsage(),
      uptime: this.checkUptime(),
      api: await this.checkApiStatus()
    };

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'warning',
      checks: checks
    };
  }

  /**
   * 检查内存使用
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const usagePercent = (usedMem / totalMem) * 100;

    return {
      type: 'memory',
      status: usagePercent < 90 ? 'healthy' : 'warning',
      message: `内存使用 ${usagePercent.toFixed(1)}%`,
      heapUsed: (usedMem / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (totalMem / 1024 / 1024).toFixed(2) + ' MB',
      usagePercent: usagePercent.toFixed(1)
    };
  }

  /**
   * 检查运行时间
   */
  checkUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);

    return {
      type: 'uptime',
      status: 'healthy',
      message: `运行 ${days}天${hours}小时${minutes}分钟`,
      uptime: uptime,
      formatted: `${days}天${hours}小时${minutes}分钟`
    };
  }

  /**
   * 检查API状态
   */
  async checkApiStatus() {
    // TODO: 从实际的API日志中统计
    // 这里返回模拟数据
    return {
      type: 'api',
      status: 'healthy',
      message: 'API正常',
      avgResponseTime: '50ms',
      errorRate: '0.1%'
    };
  }

  /**
   * 检查业务状态
   */
  async checkBusinessStatus() {
    const checks = {
      decisions: await this.checkDecisionStats(),
      backtests: await this.checkBacktestStats(),
      optimizations: await this.checkOptimizationStats()
    };

    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'warning',
      checks: checks
    };
  }

  /**
   * 检查决策统计
   */
  async checkDecisionStats() {
    const query = `
      SELECT
        COUNT(*) as total_decisions,
        COUNT(*) FILTER (WHERE decision = 'BUY') as buy_count,
        COUNT(*) FILTER (WHERE decision = 'SELL') as sell_count,
        COUNT(*) FILTER (WHERE decision = 'HOLD') as hold_count,
        AVG(overall_score) as avg_score,
        MAX(created_at) as latest_decision
      FROM decisions
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      return {
        type: 'decisions',
        status: 'healthy',
        message: `最近7天${row.total_decisions}个决策`,
        totalDecisions: row.total_decisions,
        buyCount: row.buy_count,
        sellCount: row.sell_count,
        holdCount: row.hold_count,
        avgScore: row.avg_score ? parseFloat(row.avg_score).toFixed(2) : null,
        latestDecision: row.latest_decision
      };

    } catch (error) {
      return {
        type: 'decisions',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查回测统计
   */
  async checkBacktestStats() {
    const query = `
      SELECT
        COUNT(*) as total_backtests,
        AVG(annual_return) as avg_annual_return,
        AVG(max_drawdown) as avg_max_drawdown,
        AVG(sharpe_ratio) as avg_sharpe_ratio,
        MAX(created_at) as latest_backtest
      FROM backtest_results
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      return {
        type: 'backtests',
        status: 'healthy',
        message: `最近30天${row.total_backtests}次回测`,
        totalBacktests: row.total_backtests,
        avgAnnualReturn: row.avg_annual_return ? (parseFloat(row.avg_annual_return) * 100).toFixed(2) + '%' : null,
        avgMaxDrawdown: row.avg_max_drawdown ? (parseFloat(row.avg_max_drawdown) * 100).toFixed(2) + '%' : null,
        avgSharpeRatio: row.avg_sharpe_ratio ? parseFloat(row.avg_sharpe_ratio).toFixed(2) : null,
        latestBacktest: row.latest_backtest
      };

    } catch (error) {
      return {
        type: 'backtests',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 检查优化统计
   */
  async checkOptimizationStats() {
    const query = `
      SELECT
        COUNT(*) as total_optimizations,
        AVG(iterations) as avg_iterations,
        MAX(created_at) as latest_optimization
      FROM backtest_optimizations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      return {
        type: 'optimizations',
        status: 'healthy',
        message: `最近30天${row.total_optimizations}次优化`,
        totalOptimizations: row.total_optimizations,
        avgIterations: row.avg_iterations ? Math.round(row.avg_iterations) : null,
        latestOptimization: row.latest_optimization
      };

    } catch (error) {
      return {
        type: 'optimizations',
        status: 'error',
        message: `查询失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 计算健康度评分
   */
  calculateHealthScore(status) {
    let score = 100;

    // 数据状态（40分）
    if (status.data.status === 'warning') score -= 20;
    if (status.data.status === 'error') score -= 40;

    // 系统状态（30分）
    if (status.system.status === 'warning') score -= 15;
    if (status.system.status === 'error') score -= 30;

    // 业务状态（30分）
    if (status.business.status === 'warning') score -= 15;
    if (status.business.status === 'error') score -= 30;

    return {
      score: Math.max(0, score),
      level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    };
  }

  /**
   * 创建告警
   */
  createAlert(level, type, message, details = {}) {
    const alert = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      level: level,        // INFO, WARNING, ERROR, CRITICAL
      type: type,
      message: message,
      details: details
    };

    // 保存到历史
    this.alertHistory.unshift(alert);

    // 限制历史记录数量
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(0, 1000);
    }

    // 发送告警
    this.sendAlert(alert);

    return alert;
  }

  /**
   * 发送告警
   */
  async sendAlert(alert) {
    console.log(`🚨 [${alert.level}] ${alert.type}: ${alert.message}`);

    // TODO: 实现实际的通知渠道
    // - 邮件
    // - Slack/钉钉
    // - Webhook

    // 记录到数据库
    try {
      await this.pool.query(
        `INSERT INTO monitoring_alerts (level, type, message, details, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [alert.level, alert.type, alert.message, JSON.stringify(alert.details)]
      );
    } catch (error) {
      console.error('保存告警失败:', error.message);
    }
  }

  /**
   * 获取最近的告警
   */
  getRecentAlerts(limit = 10) {
    return this.alertHistory.slice(0, limit);
  }

  /**
   * 生成监控报告
   */
  async generateMonitoringReport(period = 'daily') {
    const status = await this.getMonitoringStatus();

    const report = {
      period: period,
      generatedAt: new Date().toISOString(),
      healthScore: status.health,
      data: status.data,
      system: status.system,
      business: status.business,
      alerts: this.getRecentAlerts(period === 'daily' ? 50 : 200),
      recommendations: this.generateRecommendations(status)
    };

    return report;
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(status) {
    const recommendations = [];

    // 数据相关建议
    if (status.data.status !== 'healthy') {
      recommendations.push({
        type: 'data',
        priority: 'high',
        message: '数据更新存在问题，建议检查数据采集服务'
      });
    }

    // 系统相关建议
    if (status.system.checks.memory.status !== 'healthy') {
      recommendations.push({
        type: 'system',
        priority: 'medium',
        message: '内存使用率过高，建议重启服务或增加内存'
      });
    }

    return recommendations;
  }
}

module.exports = MonitoringService;
