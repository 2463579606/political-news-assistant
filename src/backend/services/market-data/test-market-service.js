/**
 * Enhanced Market Service 测试脚本
 *
 * 测试行情数据服务功能
 */

require('dotenv').config();
const EnhancedMarketService = require('./enhanced-market-service');

async function testMarketService() {
  const service = new EnhancedMarketService();

  console.log('🧪 开始测试EnhancedMarketService\n');

  // 测试股票列表
  const testStocks = [
    '000001.SZ',  // 平安银行
    '600000.SH',  // 浦发银行
    '000002.SZ'   // 万科A
  ];

  for (const stockCode of testStocks) {
    try {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 测试股票: ${stockCode}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // 更新股票数据
      const data = await service.updateStockData(stockCode);

      if (data && data.length > 0) {
        console.log(`\n✅ 成功获取 ${data.length} 条数据`);
        console.log(`\n最新数据 (${data[data.length - 1].tradeDate}):`);
        console.log(`  收盘价: ${data[data.length - 1].closePrice}`);
        console.log(`  MA5: ${data[data.length - 1].ma5}`);
        console.log(`  MA20: ${data[data.length - 1].ma20}`);
        console.log(`  MACD: ${data[data.length - 1].macd}`);
        console.log(`  RSI6: ${data[data.length - 1].rsi6}`);
        console.log(`  KDJ.K: ${data[data.length - 1].kdjK}`);
        console.log(`  BOLL上轨: ${data[data.length - 1].bollUpper}`);
      }

    } catch (error) {
      console.error(`\n❌ 测试失败: ${stockCode}`, error.message);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ 测试完成!`);
  console.log(`\n💡 提示: 请设置 TUSHARE_TOKEN 环境变量以使用真实数据`);
  console.log(`   获取Token: https://tushare.pro/register`);
  console.log(``);

  process.exit(0);
}

// 运行测试
testMarketService().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
