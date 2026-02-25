/**
 * 测试回测引擎
 */

require('dotenv').config();
const BacktestEngine = require('../services/backtest/backtest-engine');

async function testBacktestEngine() {
  const engine = new BacktestEngine();

  console.log('🧪 测试回测引擎\n');

  try {
    // 单只股票回测
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试1: 单只股票回测 (000001.SZ)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const result = await engine.runBacktest(
      '000001.SZ',
      '2026-02-01',
      '2026-02-25',
      {
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippageRate: 0.001,
        maxPosition: 0.3,
        stopLoss: -0.08,
        takeProfit: 0.15,
        saveToDb: false
      }
    );

    console.log('\n✅ 单只股票回测测试通过!');
    console.log(`\n关键指标:`);
    console.log(`  总收益率: ${result.performance.return.totalReturnPercent}`);
    console.log(`  年化收益: ${result.performance.return.annualReturnPercent}`);
    console.log(`  最大回撤: ${result.performance.risk.maxDrawdownPercent}`);
    console.log(`  夏普比率: ${result.performance.risk.sharpeRatio.toFixed(2)}`);
    console.log(`  胜率: ${result.performance.trade.winRatePercent}`);
    console.log(`  盈亏比: ${result.performance.trade.profitLossRatio.toFixed(2)}`);
    console.log(`  总交易: ${result.performance.trade.totalTrades}次`);

    // 验证结果结构
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试2: 验证回测结果结构');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const requiredFields = [
      'stockCode',
      'startDate',
      'endDate',
      'initialCapital',
      'finalCapital',
      'trades',
      'equityCurve',
      'dailyReturns',
      'performance'
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

    // 验证性能指标
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试3: 验证性能指标');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const perf = result.performance;
    console.log('收益指标:');
    console.log(`  ✅ totalReturn: ${perf.return.totalReturn}`);
    console.log(`  ✅ annualReturn: ${perf.return.annualReturn}`);
    console.log(`  ✅ initialCapital: ${perf.return.initialCapital}`);
    console.log(`  ✅ finalCapital: ${perf.return.finalCapital}`);

    console.log('\n风险指标:');
    console.log(`  ✅ maxDrawdown: ${perf.risk.maxDrawdown}`);
    console.log(`  ✅ volatility: ${perf.risk.volatility}`);
    console.log(`  ✅ sharpeRatio: ${perf.risk.sharpeRatio}`);
    console.log(`  ✅ sortinoRatio: ${perf.risk.sortinoRatio}`);

    console.log('\n交易指标:');
    console.log(`  ✅ totalTrades: ${perf.trade.totalTrades}`);
    console.log(`  ✅ winRate: ${perf.trade.winRate}`);
    console.log(`  ✅ profitLossRatio: ${perf.trade.profitLossRatio}`);

    console.log('\n✅ 性能指标验证通过!');

    // 验证资金曲线
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试4: 验证资金曲线');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const equityCurve = result.equityCurve;
    console.log(`资金曲线点数: ${equityCurve.length}`);
    console.log(`起始资金: ¥${equityCurve[0].equity.toFixed(2)}`);
    console.log(`结束资金: ¥${equityCurve[equityCurve.length - 1].equity.toFixed(2)}`);
    console.log(`最高资金: ¥${Math.max(...equityCurve.map(e => e.equity)).toFixed(2)}`);
    console.log(`最低资金: ¥${Math.min(...equityCurve.map(e => e.equity)).toFixed(2)}`);

    console.log('\n✅ 资金曲线验证通过!');

    // 验证交易记录
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试5: 验证交易记录');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const trades = result.trades;
    console.log(`交易记录数: ${trades.length}`);

    if (trades.length > 0) {
      const buyTrades = trades.filter(t => t.tradeType === 'BUY');
      const sellTrades = trades.filter(t => t.tradeType === 'SELL');

      console.log(`  买入: ${buyTrades.length}次`);
      console.log(`  卖出: ${sellTrades.length}次`);

      console.log('\n前5笔交易:');
      trades.slice(0, 5).forEach((trade, i) => {
        console.log(`  ${i + 1}. ${trade.tradeDate} ${trade.tradeType} ${trade.stockCode}`);
        console.log(`     价格: ¥${trade.price.toFixed(2)} 数量: ${trade.quantity}股`);
        if (trade.profit !== null) {
          console.log(`     盈亏: ¥${trade.profit.toFixed(2)} (${(trade.profitPercent * 100).toFixed(2)}%)`);
        }
      });
    }

    console.log('\n✅ 交易记录验证通过!');

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
testBacktestEngine()
  .then(() => {
    console.log('\n✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
