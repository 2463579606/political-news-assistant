/**
 * 自选股管理服务
 */

const { Pool } = require('pg');

class WatchlistService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 添加到自选股
   */
  async addToWatchlist(userId, stockCode, stockName = null) {
    const query = `
      INSERT INTO stock_watchlist (user_id, stock_code, stock_name, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, stock_code) DO NOTHING
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [userId || 'default', stockCode, stockName]);
      return {
        success: true,
        data: result.rows[0] || null,
        message: result.rows[0] ? '添加成功' : '已在自选中'
      };
    } catch (error) {
      console.error('添加自选股失败:', error.message);
      throw error;
    }
  }

  /**
   * 从自选中移除
   */
  async removeFromWatchlist(userId, stockCode) {
    const query = `
      DELETE FROM stock_watchlist
      WHERE user_id = $1 AND stock_code = $2
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [userId || 'default', stockCode]);
      return {
        success: true,
        data: result.rows[0] || null,
        message: result.rows[0] ? '移除成功' : '不在自选中'
      };
    } catch (error) {
      console.error('移除自选股失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取自选股列表
   */
  async getWatchlist(userId) {
    const query = `
      SELECT
        stock_code,
        stock_name,
        created_at,
        (SELECT decision_type FROM decisions WHERE stock_code = b.stock_code ORDER BY created_at DESC LIMIT 1) as latest_decision,
        (SELECT confidence FROM decisions WHERE stock_code = b.stock_code ORDER BY created_at DESC LIMIT 1) as latest_confidence
      FROM stock_watchlist b
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId || 'default']);
      return {
        success: true,
        data: result.rows,
        count: result.rows.length
      };
    } catch (error) {
      console.error('获取自选股失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量分析自选股
   */
  async batchAnalyzeWatchlist(userId, stockCodes) {
    // 这里返回股票代码列表，由前端调用决策API
    return {
      success: true,
      data: {
        stocks: stockCodes,
        count: stockCodes.length
      }
    };
  }
}

module.exports = WatchlistService;
