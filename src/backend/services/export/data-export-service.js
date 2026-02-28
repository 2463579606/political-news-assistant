/**
 * 数据导出服务
 * 支持导出为Excel、CSV、PDF格式
 */

const { Pool } = require('pg');

class DataExportService {
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
   * 导出决策数据为CSV
   */
  async exportDecisionToCSV(stockCode, limit = 50) {
    const query = `
      SELECT
        created_at as date,
        decision_type,
        total_score,
        technical_score,
        fund_score,
        news_score,
        confidence
      FROM decisions
      WHERE stock_code = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, limit]);
      const data = result.rows;

      if (data.length === 0) {
        // 如果没有记录,返回空CSV
        return {
          success: true,
          format: 'csv',
          filename: `${stockCode}_decisions_${new Date().toISOString().split('T')[0]}.csv`,
          content: '日期,决策,综合评分,技术面,资金面,消息面,置信度\n',
          size: 0
        };
      }

      // CSV Header
      let csv = '日期,决策,综合评分,技术面,资金面,消息面,置信度\n';

      // CSV Data
      data.forEach(row => {
        const date = new Date(row.date).toLocaleDateString('zh-CN');
        csv += `${date},${row.decision_type || 'N/A'},${row.total_score || 0},${row.technical_score || 0},${row.fund_score || 0},${row.news_score || 0},${((row.confidence || 0) * 100).toFixed(1)}%\n`;
      });

      return {
        success: true,
        format: 'csv',
        filename: `${stockCode}_decisions_${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        size: data.length
      };
    } catch (error) {
      console.error('导出决策CSV失败:', error.message);
      throw error;
    }
  }

  /**
   * 导出决策数据为JSON (用于Excel)
   */
  async exportDecisionToJSON(stockCode, limit = 50) {
    const query = `
      SELECT
        created_at,
        decision_type,
        total_score,
        technical_score,
        fund_score,
        news_score,
        confidence,
        reasoning
      FROM decisions
      WHERE stock_code = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, limit]);
      const data = result.rows;

      return {
        success: true,
        format: 'json',
        filename: `${stockCode}_decisions_${new Date().toISOString().split('T')[0]}.json`,
        content: JSON.stringify(data, null, 2),
        size: data.length
      };
    } catch (error) {
      console.error('导出决策JSON失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成完整的分析报告
   */
  async generateReport(stockCode) {
    const query = `
      SELECT
        created_at,
        decision_type,
        total_score,
        technical_score,
        fund_score,
        news_score,
        confidence,
        reasoning
      FROM decisions
      WHERE stock_code = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);

      if (result.rows.length === 0) {
        throw new Error('未找到决策记录');
      }

      const decision = result.rows[0];

      // 生成Markdown报告
      const report = this.generateMarkdownReport(stockCode, decision);

      return {
        success: true,
        format: 'markdown',
        filename: `${stockCode}_report_${new Date().toISOString().split('T')[0]}.md`,
        content: report
      };
    } catch (error) {
      console.error('生成报告失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成Markdown格式报告
   */
  generateMarkdownReport(stockCode, decision) {
    const date = new Date(decision.created_at).toLocaleDateString('zh-CN');

    let report = `# ${stockCode} AI投资决策报告\n\n`;
    report += `**生成时间**: ${date}\n\n`;
    report += `---\n\n`;

    // 决策摘要
    report += `## 决策摘要\n\n`;
    report += `- **决策建议**: ${this.getDecisionText(decision.decision_type)}\n`;
    report += `- **综合评分**: ${decision.total_score || 0}分\n`;
    report += `- **置信度**: ${((decision.confidence || 0) * 100).toFixed(1)}%\n\n`;

    // 多维度评分
    report += `## 多维度评分\n\n`;
    report += `| 维度 | 评分 | 等级 |\n`;
    report += `|------|------|------|\n`;
    report += `| 技术面 | ${decision.technical_score || 0}分 | ${this.getGrade(decision.technical_score)} |\n`;
    report += `| 资金面 | ${decision.fund_score || 0}分 | ${this.getGrade(decision.fund_score)} |\n`;
    report += `| 消息面 | ${decision.news_score || 0}分 | ${this.getGrade(decision.news_score)} |\n\n`;

    // 分析理由
    if (decision.reasoning) {
      report += `## 分析理由\n\n`;
      report += `${decision.reasoning}\n\n`;
    }

    report += `---\n\n`;
    report += `*本报告由AI投资决策助手自动生成，仅供参考，不构成投资建议。*\n`;
    report += `*市场存在不确定性，请谨慎决策。*\n`;

    return report;
  }

  /**
   * 批量导出决策数据
   */
  async batchExportDecisions(stockCodes, format = 'json') {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        if (format === 'csv') {
          const result = await this.exportDecisionToCSV(stockCode);
          results.push({ stockCode, success: true, data: result });
        } else {
          const result = await this.exportDecisionToJSON(stockCode);
          results.push({ stockCode, success: true, data: result });
        }
      } catch (error) {
        results.push({ stockCode, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 导出自选股列表
   */
  async exportWatchlist(userId) {
    const query = `
      SELECT
        stock_code,
        stock_name,
        created_at
      FROM bookmarks
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      const data = result.rows;

      let csv = '股票代码,股票名称,添加时间\n';
      data.forEach(row => {
        const date = new Date(row.created_at).toLocaleDateString('zh-CN');
        csv += `${row.stock_code},${row.stock_name || ''},${date}\n`;
      });

      return {
        success: true,
        format: 'csv',
        filename: `watchlist_${new Date().toISOString().split('T')[0]}.csv`,
        content: csv,
        size: data.length
      };
    } catch (error) {
      console.error('导出自选股失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取决策文本
   */
  getDecisionText(decision) {
    const map = {
      'STRONG_BUY': '强烈买入 🚀',
      'BUY': '买入 💪',
      'POSITIVE_HOLD': '继续持有 ✅',
      'HOLD': '持有观望 ⏸',
      'SELL': '卖出 🔻',
      'STRONG_SELL': '强烈卖出 ⚠'
    };
    return map[decision] || decision;
  }

  /**
   * 获取等级
   */
  getGrade(score) {
    if (score >= 70) return 'A';
    if (score >= 50) return 'B';
    return 'C';
  }
}

module.exports = DataExportService;
