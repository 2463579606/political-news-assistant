/**
 * 获取真实A股数据
 * 使用Tushare API获取热门股票的真实数据
 */

require('dotenv').config();
const TushareService = require('../services/market-data/enhanced-market-service');
const FundFlowService = require('../services/fund-flow/fund-flow-service');
const NewsAnalysisService = require('../services/news-analysis/news-analysis-service');

class RealDataFetcher {
  constructor() {
    this.marketService = new TushareService();
    this.fundFlowService = new FundFlowService();
    this.newsService = new NewsAnalysisService();
  }

  /**
   * 获取热门股票的真实数据
   */
  async fetchHotStocksRealData() {
    console.log('\n=== 获取真实A股数据 ===\n');

    // 热门股票列表（大盘蓝筹股）
    const hotStocks = [
      '000001.SZ',  // 平安银行
      '000002.SZ',  // 万科A
      '600000.SH',  // 浦发银行
      '600036.SH',  // 招商银行
      '600519.SH',  // 贵州茅台
      '000858.SZ',  // 五粮液
      '600900.SH',  // 长江电力
      '601318.SH',  // 中国平安
      '000063.SZ',  // 中兴通讯
      '002475.SZ'   // 立讯精密
    ];

    console.log(`📊 将获取 ${hotStocks.length} 只热门股票的真实数据\n`);
    console.log('='.repeat(70));

    const results = {
      marketData: 0,
      fundFlow: 0,
      newsEvents: 0,
      errors: []
    };

    // 获取最近3个月的数据
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0].replace(/-/g, '');

    console.log(`数据期间: ${startDate} ~ ${endDate}\n`);

    for (let i = 0; i < hotStocks.length; i++) {
      const stockCode = hotStocks[i];
      console.log(`\n[${i + 1}/${hotStocks.length}] 处理 ${stockCode}...`);

      try {
        // 1. 获取市场数据
        console.log(`  📈 获取市场数据...`);
        const marketData = await this.marketService.getDailyK(
          stockCode,
          startDate,
          endDate,
          120
        );

        if (marketData && marketData.length > 0) {
          console.log(`     ✅ 获取 ${marketData.length} 条K线数据`);
          results.marketData += marketData.length;
        } else {
          console.log(`     ⚠️  无市场数据`);
        }

        // 2. 获取资金流向（Tushare不直接提供，使用模拟数据）
        console.log(`  💰 资金流向数据...`);
        // 资金流向数据通常需要专门的付费API，这里暂时跳过
        console.log(`     ℹ️  资金流向数据需要专业API（暂时跳过）`);

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`  ❌ 失败: ${error.message}`);
        results.errors.push({
          stockCode: stockCode,
          error: error.message
        });
      }
    }

    // 打印汇总
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 数据获取汇总');
    console.log('='.repeat(70));
    console.log(`市场数据: ${results.marketData} 条`);
    console.log(`错误: ${results.errors.length} 个`);

    if (results.errors.length > 0) {
      console.log('\n错误详情:');
      results.errors.forEach(err => {
        console.log(`  ${err.stockCode}: ${err.error}`);
      });
    }

    console.log('\n✅ 真实数据获取完成!');
    console.log('\n💡 现在可以测试决策功能了');
  }

  /**
   * 获取单只股票的完整数据
   */
  async fetchSingleStockData(stockCode) {
    console.log(`\n📊 获取 ${stockCode} 的真实数据\n`);

    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0].replace(/-/g, '');

    try {
      // 获取市场数据
      console.log('📈 获取K线数据...');
      const marketData = await this.marketService.getDailyK(
        stockCode,
        startDate,
        endDate,
        120
      );

      if (marketData && marketData.length > 0) {
        console.log(`✅ 获取 ${marketData.length} 条K线数据`);

        // 显示最新数据
        const latest = marketData[0];
        console.log(`\n最新数据 (${latest.trade_date}):`);
        console.log(`  开盘: ¥${latest.open_price}`);
        console.log(`  收盘: ¥${latest.close_price}`);
        console.log(`  最高: ¥${latest.high_price}`);
        console.log(`  最低: ¥${latest.low_price}`);
        console.log(`  成交量: ${latest.volume}`);

        return {
          stockCode,
          marketData,
          success: true
        };
      } else {
        console.log('❌ 无数据返回');
        return { stockCode, success: false, error: 'No data returned' };
      }

    } catch (error) {
      console.error(`❌ 获取失败: ${error.message}`);
      return { stockCode, success: false, error: error.message };
    }
  }
}

// 主函数
async function main() {
  const fetcher = new RealDataFetcher();

  // 检查Tushare Token
  if (!process.env.TUSHARE_TOKEN) {
    console.log('\n❌ 错误: TUSHARE_TOKEN 未配置!');
    console.log('\n请按以下步骤配置:');
    console.log('1. 访问: https://tushare.pro/register');
    console.log('2. 注册并获取免费Token');
    console.log('3. 编辑 .env 文件，添加: TUSHARE_TOKEN=你的token');
    console.log('4. 重新运行此脚本\n');
    process.exit(1);
  }

  console.log('✅ TUSHARE_TOKEN 已配置\n');

  // 检查命令行参数
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] === 'single') {
    // 获取单只股票
    const stockCode = args[1] || '000001.SZ';
    await fetcher.fetchSingleStockData(stockCode);
  } else {
    // 获取所有热门股票
    await fetcher.fetchHotStocksRealData();
  }
}

// 运行
main()
  .then(() => {
    console.log('\n✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
