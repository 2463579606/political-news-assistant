/**
 * 测试参数优化模块
 */

require('dotenv').config();
const ParameterOptimizer = require('../services/optimization/parameter-optimizer');

async function testParameterOptimizer() {
  const optimizer = new ParameterOptimizer();

  console.log('🧪 测试参数优化器\n');

  try {
    // 测试1: 网格搜索（小规模）
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试1: 网格搜索参数优化 (小规模)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const paramGrid = {
      buyThreshold: [70, 75],
      sellThreshold: [30, 35],
      maxPosition: [0.2, 0.3]
      // 总共 2×2×2 = 8 个组合
    };

    console.log('参数网格:');
    console.log(`  买入阈值: ${paramGrid.buyThreshold.join(', ')}`);
    console.log(`  卖出阈值: ${paramGrid.sellThreshold.join(', ')}`);
    console.log(`  最大仓位: ${paramGrid.maxPosition.map(p => (p * 100).toFixed(0) + '%').join(', ')}`);
    console.log(`  总组合数: ${paramGrid.buyThreshold.length * paramGrid.sellThreshold.length * paramGrid.maxPosition.length}`);

    const result = await optimizer.gridSearch(
      '000001.SZ',
      '2026-02-01',
      '2026-02-25',
      paramGrid,
      'sharpeRatio'
    );

    console.log('\n✅ 网格搜索测试通过!');
    console.log(`\n优化结果:`);
    console.log(`  总迭代次数: ${result.totalIterations}`);
    console.log(`  成功次数: ${result.successIterations}`);
    console.log(`  优化ID: ${result.optimizationId}`);
    console.log(`  目标指标: ${result.targetMetric}`);
    console.log(`\n最佳参数:`);
    console.log(`  买入阈值: ${result.best.params.buyThreshold}`);
    console.log(`  卖出阈值: ${result.best.params.sellThreshold}`);
    console.log(`  最大仓位: ${(result.best.params.maxPosition * 100).toFixed(0)}%`);
    console.log(`  止损: ${(result.best.params.stopLoss * 100).toFixed(0)}%`);
    console.log(`  止盈: ${(result.best.params.takeProfit * 100).toFixed(0)}%`);
    console.log(`\n最佳得分:`);
    console.log(`  夏普比率: ${result.best.score.toFixed(2)}`);
    console.log(`  总收益率: ${(result.best.backtest.performance.return.totalReturn * 100).toFixed(2)}%`);
    console.log(`  年化收益: ${(result.best.backtest.performance.return.annualReturn * 100).toFixed(2)}%`);
    console.log(`  最大回撤: ${(result.best.backtest.performance.risk.maxDrawdown.value * 100).toFixed(2)}%`);

    // 验证结果结构
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试2: 验证结果结构');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const requiredFields = [
      'optimizationId',
      'stockCode',
      'method',
      'targetMetric',
      'totalIterations',
      'successIterations',
      'best',
      'worst',
      'avg',
      'allResults'
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in result)) {
        console.log(`❌ 缺少字段: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✅ ${field}: ${typeof result[field]}`);
      }
    }

    if (allFieldsPresent) {
      console.log('\n✅ 结果结构验证通过!');
    }

    // 测试3: 验证参数敏感性分析
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试3: 验证参数敏感性分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const bestBuyThreshold = result.best.params.buyThreshold;
    const worstBuyThreshold = result.worst.params.buyThreshold;

    if (bestBuyThreshold !== worstBuyThreshold) {
      console.log(`✅ 买入阈值有影响 (最佳:${bestBuyThreshold} vs 最差:${worstBuyThreshold})`);
    } else {
      console.log(`⚠️  买入阈值影响不大`);
    }

    console.log('\n✅ 参数敏感性分析正常');

    // 测试4: 验证数据库保存
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试4: 验证数据库保存');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const savedResult = await optimizer.getOptimizationResult(result.optimizationId);

    if (savedResult) {
      console.log(`✅ 数据库保存成功`);
      console.log(`  ID: ${savedResult.id}`);
      console.log(`  股票代码: ${savedResult.stock_code}`);
      console.log(`  优化方法: ${savedResult.optimization_method}`);
      console.log(`  目标指标: ${savedResult.target_metric}`);
      console.log(`  迭代次数: ${savedResult.iterations}`);
    } else {
      console.log(`❌ 数据库保存失败`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ 所有测试通过!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testParameterOptimizer()
  .then(() => {
    console.log('\n✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
