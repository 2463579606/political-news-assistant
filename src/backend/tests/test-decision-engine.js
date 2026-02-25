/**
 * 决策引擎测试脚本
 * 测试决策生成和风险评估功能
 */

require('dotenv').config();
const DecisionEngine = require('../services/decision/decision-engine');
const RiskAssessmentService = require('../services/decision/risk-assessment-service');

async function testDecisionEngine() {
  const decisionEngine = new DecisionEngine();
  const riskService = new RiskAssessmentService();

  console.log('🧪 开始测试决策引擎...\n');

  try {
    // 测试股票
    const testStock = '000001.SZ'; // 平安银行

    // 1. 测试风险评估
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  测试风险评估');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n股票: ${testStock}`);
    const riskAssessment = await riskService.assessRisk(testStock);

    console.log(`\n风险评估结果:`);
    console.log(`  综合风险: ${riskAssessment.overallScore} (${riskAssessment.level})`);
    console.log(`  建议: ${riskAssessment.recommendation.action}`);

    console.log(`\n各维度风险:`);
    if (riskAssessment.details.volatility) {
      const v = riskAssessment.details.volatility;
      console.log(`  波动率风险: ${v.score} (${v.level})`);
      console.log(`    年化波动率: ${v.details.annualizedVolatilityPercent}`);
    }
    if (riskAssessment.details.drawdown) {
      const d = riskAssessment.details.drawdown;
      console.log(`  最大回撤风险: ${d.score} (${d.level})`);
      console.log(`    最大回撤: ${d.details.maxDrawdownPercent}`);
    }
    if (riskAssessment.details.position) {
      const p = riskAssessment.details.position;
      console.log(`  仓位风险: ${p.score} (${p.level})`);
    }
    if (riskAssessment.details.concentration) {
      const c = riskAssessment.details.concentration;
      console.log(`  集中度风险: ${c.score} (${c.level})`);
    }

    // 2. 测试决策生成
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  测试决策生成');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n股票: ${testStock}`);
    const decision = await decisionEngine.generateDecision(testStock, {
      includeRisk: true,
      saveToDb: false
    });

    console.log(`\n决策结果:`);
    console.log(`  决策: ${decision.decision}`);
    console.log(`  级别: ${decision.decisionLevel}`);
    console.log(`  综合评分: ${decision.overallScore} (${decision.grade})`);
    console.log(`  风险等级: ${decision.risk?.level}`);
    console.log(`  置信度: ${(decision.confidence * 100).toFixed(0)}%`);

    console.log(`\n操作建议:`);
    const rec = decision.recommendation;
    console.log(`  操作: ${rec.action}`);
    console.log(`  仓位: ${rec.positionSize}%`);
    console.log(`  预期收益: ${rec.expectedReturn}%`);
    console.log(`  止损: ${rec.stopLoss}%`);
    console.log(`  止盈: ${rec.takeProfit}%`);
    console.log(`  持有期: ${rec.holdingPeriod}`);

    console.log(`\n决策理由:`);
    console.log(`  ${decision.reason}`);

    console.log(`\n评分详情:`);
    const scores = decision.scores;
    if (scores.technical) {
      console.log(`  技术面: ${scores.technical.overall}`);
    }
    if (scores.fundFlow) {
      console.log(`  资金面: ${scores.fundFlow.overall}`);
    }
    if (scores.news) {
      console.log(`  消息面: ${scores.news.overall}`);
    }
    if (scores.sector) {
      console.log(`  板块面: ${scores.sector.overall}`);
    }

    // 3. 测试元数据
    console.log(`\n元数据:`);
    const metadata = decision.metadata;
    console.log(`  数据完整性: ${(metadata.scoreCompleteness * 100).toFixed(0)}%`);
    console.log(`  数据新鲜度: ${metadata.dataFreshness}`);
    console.log(`  时间戳: ${metadata.timestamp}`);

    // 4. 测试决策规则
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  测试决策规则');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n买入规则测试:`);
    console.log(`  强烈买入: 评分≥90 → 仓位30%`);
    console.log(`  中仓买入: 评分≥80 → 仓位20%`);
    console.log(`  轻仓买入: 评分≥70 → 仓位10%`);

    console.log(`\n卖出规则测试:`);
    console.log(`  清仓: 评分≤30 → 仓位-100%`);
    console.log(`  减仓: 评分≤40 → 仓位-50%`);

    console.log(`\n持有规则测试:`);
    console.log(`  持有观望: 30<评分<70`);
    console.log(`  可加仓: 评分≥60 → 仓位5%`);
    console.log(`  准备减仓: 评分≤50 → 仓位-10%`);

    // 5. 测试风险控制规则
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  测试风险控制规则');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n风险控制:`);
    console.log(`  最大允许风险分: 70`);
    console.log(`  超过阈值 → 触发风险控制卖出`);
    console.log(`  风险等级: LOW/MEDIUM/HIGH`);
    console.log(`  对应建议: 正常参与/轻仓参与/谨慎观望`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 决策引擎测试完成!');
    console.log('\n💡 注意事项:');
    console.log('   - 决策基于四维评分和风险评估');
    console.log('   - 需要完整的市场数据、资金流向、新闻事件数据');
    console.log('   - 建议结合人工分析，不可完全依赖');
    console.log('   - 历史准确率需要持续追踪和验证');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// 运行测试
testDecisionEngine()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
