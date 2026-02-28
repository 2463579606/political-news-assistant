/**
 * 基本面评分服务
 * 分析公司财务状况
 *
 * 评分维度:
 * 1. 盈利能力 (30%) - ROE、毛利率、净利率
 * 2. 成长性 (30%) - 营收增长、利润增长
 * 3. 财务健康 (20%) - 资产负债率、流动比率
 * 4. 估值水平 (20%) - PE、PB、PS
 */

const TushareDataService = require('../data/tushare-service');

class FundamentalScoreService {
  constructor() {
    this.tushareData = TushareDataService;
  }

  /**
   * 计算基本面评分
   */
  async calculateFundamentalScore(stockCode) {
    try {
      // 获取财务指标
      const financialData = await this.tushareData.getFinancialIndicator(stockCode);

      if (!financialData || financialData.length === 0) {
        console.log('⚠️  无法获取财务数据，使用默认评分');
        return this.getDefaultScore();
      }

      const latest = financialData[0];

      const scores = {
        // 盈利能力评分 (0-100)
        profitability: {
          roe: this.scoreROE(latest.roe),
          grossMargin: this.scoreGrossMargin(latest.grossprofit_margin),
          netMargin: this.scoreNetMargin(latest.netprofit_margin),
          overall: 0,
          weight: 0.30
        },

        // 成长性评分 (0-100)
        growth: {
          revenueGrowth: this.scoreRevenueGrowth(latest.or_yoy),
          profitGrowth: this.scoreProfitGrowth(latest.op_yoy),
          assetGrowth: this.scoreAssetGrowth(latest.assets_yoy),
          overall: 0,
          weight: 0.30
        },

        // 财务健康评分 (0-100)
        financialHealth: {
          debtRatio: this.scoreDebtRatio(latest.debt_to_assets),
          currentRatio: this.scoreCurrentRatio(latest.current_ratio),
          quickRatio: this.scoreQuickRatio(latest.quick_ratio),
          overall: 0,
          weight: 0.20
        },

        // 运营效率评分 (0-100)
        efficiency: {
          assetTurnover: this.scoreAssetTurnover(latest.assets_turn),
          inventoryTurnover: this.scoreInventoryTurnover(latest.inv_turn),
          receivableTurnover: this.scoreReceivableTurnover(latest.ar_turn),
          overall: 0,
          weight: 0.20
        },

        overall: 0,
        grade: '',
        data: latest
      };

      // 计算各维度总分
      scores.profitability.overall = this.calculateProfitabilityOverall(scores.profitability);
      scores.growth.overall = this.calculateGrowthOverall(scores.growth);
      scores.financialHealth.overall = this.calculateFinancialHealthOverall(scores.financialHealth);
      scores.efficiency.overall = this.calculateEfficiencyOverall(scores.efficiency);

      // 计算基本面总分
      scores.overall = (
        scores.profitability.overall * scores.profitability.weight +
        scores.growth.overall * scores.growth.weight +
        scores.financialHealth.overall * scores.financialHealth.weight +
        scores.efficiency.overall * scores.efficiency.weight
      );

      // 评级
      scores.grade = this.getGrade(scores.overall);

      console.log(`✅ 基本面评分完成: ${stockCode}`);
      console.log(`   盈利能力: ${scores.profitability.overall.toFixed(2)}`);
      console.log(`   成长性: ${scores.growth.overall.toFixed(2)}`);
      console.log(`   财务健康: ${scores.financialHealth.overall.toFixed(2)}`);
      console.log(`   运营效率: ${scores.efficiency.overall.toFixed(2)}`);
      console.log(`   总评分: ${scores.overall.toFixed(2)} (${scores.grade})`);

      return scores;

    } catch (error) {
      console.error(`❌ 基本面评分失败: ${error.message}`);
      return this.getDefaultScore();
    }
  }

  /**
   * 盈利能力评分
   */
  scoreROE(roe) {
    if (!roe) return 50;
    // ROE >= 20% 为优秀
    if (roe >= 20) return 100;
    if (roe >= 15) return 90;
    if (roe >= 10) return 75;
    if (roe >= 5) return 60;
    if (roe >= 0) return 40;
    return 20;
  }

  scoreGrossMargin(margin) {
    if (!margin) return 50;
    // 毛利率 >= 50% 为优秀
    if (margin >= 50) return 100;
    if (margin >= 40) return 90;
    if (margin >= 30) return 75;
    if (margin >= 20) return 60;
    if (margin >= 10) return 40;
    return 20;
  }

  scoreNetMargin(margin) {
    if (!margin) return 50;
    // 净利率 >= 20% 为优秀
    if (margin >= 20) return 100;
    if (margin >= 15) return 90;
    if (margin >= 10) return 75;
    if (margin >= 5) return 60;
    if (margin >= 0) return 40;
    return 20;
  }

  /**
   * 成长性评分
   */
  scoreRevenueGrowth(growth) {
    if (!growth) return 50;
    // 营收增长率 >= 30% 为优秀
    if (growth >= 30) return 100;
    if (growth >= 20) return 90;
    if (growth >= 10) return 75;
    if (growth >= 5) return 60;
    if (growth >= 0) return 50;
    if (growth >= -10) return 30;
    return 10;
  }

  scoreProfitGrowth(growth) {
    if (!growth) return 50;
    // 利润增长率 >= 30% 为优秀
    if (growth >= 30) return 100;
    if (growth >= 20) return 90;
    if (growth >= 10) return 75;
    if (growth >= 5) return 60;
    if (growth >= 0) return 50;
    if (growth >= -10) return 30;
    return 10;
  }

  scoreAssetGrowth(growth) {
    if (!growth) return 50;
    // 资产增长率适中为好
    if (growth >= 20) return 90;
    if (growth >= 10) return 100;
    if (growth >= 5) return 85;
    if (growth >= 0) return 60;
    if (growth >= -5) return 40;
    return 20;
  }

  /**
   * 财务健康评分
   */
  scoreDebtRatio(ratio) {
    if (!ratio) return 50;
    // 资产负债率 <= 40% 为优秀
    if (ratio <= 30) return 100;
    if (ratio <= 40) return 90;
    if (ratio <= 50) return 75;
    if (ratio <= 60) return 60;
    if (ratio <= 70) return 40;
    return 20;
  }

  scoreCurrentRatio(ratio) {
    if (!ratio) return 50;
    // 流动比率 >= 2 为优秀
    if (ratio >= 2.5) return 100;
    if (ratio >= 2.0) return 90;
    if (ratio >= 1.5) return 75;
    if (ratio >= 1.0) return 60;
    if (ratio >= 0.5) return 40;
    return 20;
  }

  scoreQuickRatio(ratio) {
    if (!ratio) return 50;
    // 速动比率 >= 1.5 为优秀
    if (ratio >= 1.5) return 100;
    if (ratio >= 1.0) return 85;
    if (ratio >= 0.8) return 70;
    if (ratio >= 0.5) return 50;
    return 30;
  }

  /**
   * 运营效率评分
   */
  scoreAssetTurnover(turnover) {
    if (!turnover) return 50;
    // 总资产周转率 >= 1.0 为优秀
    if (turnover >= 1.5) return 100;
    if (turnover >= 1.0) return 85;
    if (turnover >= 0.8) return 70;
    if (turnover >= 0.5) return 50;
    return 30;
  }

  scoreInventoryTurnover(turnover) {
    if (!turnover) return 50;
    // 存货周转率越高越好
    if (turnover >= 10) return 100;
    if (turnover >= 5) return 85;
    if (turnover >= 3) return 70;
    if (turnover >= 1) return 50;
    return 30;
  }

  scoreReceivableTurnover(turnover) {
    if (!turnover) return 50;
    // 应收账款周转率越高越好
    if (turnover >= 10) return 100;
    if (turnover >= 5) return 85;
    if (turnover >= 3) return 70;
    if (turnover >= 1) return 50;
    return 30;
  }

  /**
   * 计算各维度总分
   */
  calculateProfitabilityOverall(profitability) {
    return (
      profitability.roe * 0.4 +
      profitability.grossMargin * 0.3 +
      profitability.netMargin * 0.3
    );
  }

  calculateGrowthOverall(growth) {
    return (
      growth.revenueGrowth * 0.4 +
      growth.profitGrowth * 0.4 +
      growth.assetGrowth * 0.2
    );
  }

  calculateFinancialHealthOverall(health) {
    return (
      health.debtRatio * 0.4 +
      health.currentRatio * 0.3 +
      health.quickRatio * 0.3
    );
  }

  calculateEfficiencyOverall(efficiency) {
    return (
      efficiency.assetTurnover * 0.4 +
      efficiency.inventoryTurnover * 0.3 +
      efficiency.receivableTurnover * 0.3
    );
  }

  /**
   * 获取评级
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  }

  /**
   * 获取默认评分
   */
  getDefaultScore() {
    return {
      profitability: { overall: 50, weight: 0.30 },
      growth: { overall: 50, weight: 0.30 },
      financialHealth: { overall: 50, weight: 0.20 },
      efficiency: { overall: 50, weight: 0.20 },
      overall: 50,
      grade: 'C',
      data: null
    };
  }

  /**
   * 生成分析报告
   */
  generateReport(scores) {
    if (!scores) return '';

    let report = [];

    // 盈利能力分析
    if (scores.profitability.overall >= 80) {
      report.push('盈利能力优秀，ROE和利润率水平突出');
    } else if (scores.profitability.overall >= 60) {
      report.push('盈利能力良好，处于行业中上水平');
    } else if (scores.profitability.overall >= 40) {
      report.push('盈利能力一般，有提升空间');
    } else {
      report.push('盈利能力较弱，需要关注');
    }

    // 成长性分析
    if (scores.growth.overall >= 80) {
      report.push('成长性强，营收和利润保持快速增长');
    } else if (scores.growth.overall >= 60) {
      report.push('成长性良好，保持稳定增长态势');
    } else if (scores.growth.overall >= 40) {
      report.push('成长性一般，增速放缓');
    } else {
      report.push('成长性不足，营收或利润出现下滑');
    }

    // 财务健康分析
    if (scores.financialHealth.overall >= 80) {
      report.push('财务状况健康，偿债能力良好');
    } else if (scores.financialHealth.overall >= 60) {
      report.push('财务状况稳健，风险可控');
    } else if (scores.financialHealth.overall >= 40) {
      report.push('财务状况一般，需要关注偿债风险');
    } else {
      report.push('财务状况较差，存在一定风险');
    }

    return report.join('；') + '。';
  }
}

module.exports = FundamentalScoreService;
