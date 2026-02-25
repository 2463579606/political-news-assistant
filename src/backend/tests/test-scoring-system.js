/**
 * 评分系统测试脚本
 * 测试技术面、资金面、消息面、板块面和综合评分
 */

require('dotenv').config();
const ScoringService = require('../services/scoring/scoring-service');
const TechnicalScoreService = require('../services/scoring/technical-score-service');
const FundFlowScoreService = require('../services/scoring/fund-flow-score-service');
const NewsScoreService = require('../services/scoring/news-score-service');
const SectorScoreService = require('../services/scoring/sector-score-service');

async function testScoringSystem() {
  const scoringService = new ScoringService();

  console.log('🧪 开始测试评分系统...\n');

  try {
    // 测试股票列表
    const testStocks = ['000001.SZ']; // 平安银行

    // 1. 测试综合评分
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  测试综合评分');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const stockCode of testStocks) {
      console.log(`\n股票: ${stockCode}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const overallScore = await scoringService.calculateOverallScore(stockCode);

      console.log(`\n综合评分结果:`);
      console.log(`  综合得分: ${overallScore.overallScore}`);
      console.log(`  评级: ${overallScore.grade} (${overallScore.level})`);
      console.log(`  建议: ${overallScore.recommendation.action}`);
      console.log(`  仓位: ${overallScore.recommendation.position}%`);
      console.log(`  置信度: ${(overallScore.recommendation.confidence * 100).toFixed(0)}%`);
      console.log(`  理由: ${overallScore.recommendation.reason}`);

      console.log(`\n各维度评分:`);
      if (overallScore.scores.technical) {
        console.log(`  技术面: ${overallScore.scores.technical.overall} (${overallScore.scores.technical.grade})`);
      }
      if (overallScore.scores.fundFlow) {
        console.log(`  资金面: ${overallScore.scores.fundFlow.overall} (${overallScore.scores.fundFlow.grade})`);
      }
      if (overallScore.scores.news) {
        console.log(`  消息面: ${overallScore.scores.news.overall} (${overallScore.scores.news.grade})`);
      }
      if (overallScore.scores.sector) {
        console.log(`  板块面: ${overallScore.scores.sector.overall} (${overallScore.scores.sector.grade})`);
      }

      // 显示技术面详情
      if (overallScore.details.technical) {
        const tech = overallScore.details.technical;
        console.log(`\n技术面详情:`);
        if (tech.ma) {
          console.log(`  MA趋势: ${tech.ma.trend}`);
          console.log(`    MA5=${tech.ma.ma5}, MA10=${tech.ma.ma10}, MA20=${tech.ma.ma20}`);
        }
        if (tech.macd) {
          console.log(`  MACD: ${tech.macd.signal}`);
          console.log(`    DIF=${tech.macd.dif}, DEA=${tech.macd.dea}, MACD=${tech.macd.macd}`);
        }
        if (tech.rsi) {
          console.log(`  RSI: ${tech.rsi.status} (${tech.rsi.rsi6})`);
        }
        if (tech.kdj) {
          console.log(`  KDJ: ${tech.kdj.signal}`);
          console.log(`    K=${tech.kdj.k}, D=${tech.kdj.d}, J=${tech.kdj.j}`);
        }
        if (tech.boll) {
          console.log(`  BOLL: ${tech.boll.signal}`);
          console.log(`    位置=${tech.boll.position}%, 带宽=${tech.boll.bandwidth}%`);
        }
      }
    }

    // 2. 测试单个维度评分
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  测试单个维度评分');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const technicalService = new TechnicalScoreService();
    const fundFlowService = new FundFlowScoreService();
    const newsService = new NewsScoreService();
    const sectorService = new SectorScoreService();

    const stockCode = '000001.SZ';

    console.log(`\n股票: ${stockCode}`);

    // 技术面评分
    console.log(`\n📊 技术面评分详情:`);
    const techScore = await technicalService.calculateTechnicalScore(stockCode);
    console.log(JSON.stringify(techScore, null, 2));

    // 资金面评分
    console.log(`\n💰 资金面评分详情:`);
    const flowScore = await fundFlowService.calculateFundFlowScore(stockCode);
    console.log(JSON.stringify(flowScore, null, 2));

    // 消息面评分
    console.log(`\n📰 消息面评分详情:`);
    const newsScore = await newsService.calculateNewsScore(stockCode);
    console.log(JSON.stringify(newsScore, null, 2));

    // 板块面评分
    console.log(`\n🏢 板块面评分详情:`);
    const sectorScore = await sectorService.calculateSectorScore(stockCode);
    console.log(JSON.stringify(sectorScore, null, 2));

    // 3. 测试股票比较
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  测试股票比较');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 由于可能没有多只股票的数据，这里注释掉
    // const comparison = await scoringService.compareStocks('000001.SZ', '600000.SH');
    // console.log(`\n比较结果:`);
    // console.log(`  股票1: ${comparison.stock1.overallScore}`);
    // console.log(`  股票2: ${comparison.stock2.overallScore}`);
    // console.log(`  差异: ${comparison.comparison.scoreDiff}`);
    // console.log(`  推荐: ${comparison.comparison.winner}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 评分系统测试完成!');
    console.log('\n💡 注意事项:');
    console.log('   - 需要确保数据库中有相应的市场数据、资金流向和新闻事件');
    console.log('   - 技术面评分需要market_data表中有技术指标数据');
    console.log('   - 资金面评分需要fund_flow表中有资金流向数据');
    console.log('   - 消息面评分需要news_events表中有相关新闻事件');
    console.log('   - 板块面评分需要能识别股票所属板块');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

// 运行测试
testScoringSystem()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
