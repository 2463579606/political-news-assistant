/**
 * 创建测试市场数据
 * 用于测试评分系统和决策引擎
 */

require('dotenv').config();
const { Pool } = require('pg');

async function createTestData() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('📊 创建测试市场数据...\n');

  try {
    // 清理旧数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  清理旧数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await pool.query('DELETE FROM market_data WHERE stock_code = $1', ['000001.SZ']);
    await pool.query('DELETE FROM fund_flow WHERE stock_code = $1', ['000001.SZ']);
    console.log('✅ 清理完成');

    // 创建K线数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  创建K线数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stockCode = '000001.SZ';
    const basePrice = 15.00;
    const today = new Date();

    for (let i = 59; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const tradeDate = date.toISOString().split('T')[0];

      // 生成价格数据（随机波动）
      const randomChange = (Math.random() - 0.5) * 0.5; // -0.25到+0.25
      const openPrice = basePrice + randomChange;
      const closePrice = openPrice + (Math.random() - 0.5) * 0.3;
      const highPrice = Math.max(openPrice, closePrice) + Math.random() * 0.2;
      const lowPrice = Math.min(openPrice, closePrice) - Math.random() * 0.2;
      const volume = Math.floor(1000000 + Math.random() * 5000000);
      const amount = volume * ((highPrice + lowPrice) / 2);

      // 计算技术指标
      const ma5 = closePrice * (1 + (Math.random() - 0.5) * 0.02);
      const ma10 = closePrice * (1 + (Math.random() - 0.5) * 0.03);
      const ma20 = closePrice * (1 + (Math.random() - 0.5) * 0.05);
      const ma60 = closePrice * (1 + (Math.random() - 0.5) * 0.08);

      // MACD
      const macdVal = (Math.random() - 0.5) * 0.2;
      const macdSignal = macdVal * 0.9;
      const macdHist = macdVal - macdSignal;

      // RSI
      const rsi6 = 30 + Math.random() * 40; // 30-70
      const rsi12 = 35 + Math.random() * 30;
      const rsi24 = 40 + Math.random() * 20;

      // KDJ
      const kdjK = 20 + Math.random() * 60;
      const kdjD = kdjK * (0.8 + Math.random() * 0.2);
      const kdjJ = 3 * kdjK - 2 * kdjD;

      // BOLL
      const bollMid = ma20;
      const std = closePrice * 0.02;
      const bollUpper = bollMid + 2 * std;
      const bollLower = bollMid - 2 * std;

      await pool.query(
        `INSERT INTO market_data (
          stock_code, trade_date, open_price, close_price, high_price, low_price, volume, amount,
          ma5, ma10, ma20, ma60, macd, macd_signal, macd_hist, rsi6, rsi12, rsi24, kdj_k, kdj_d, kdj_j,
          boll_upper, boll_mid, boll_lower
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (stock_code, trade_date) DO NOTHING`,
        [
          stockCode, tradeDate, openPrice.toFixed(2), closePrice.toFixed(2),
          highPrice.toFixed(2), lowPrice.toFixed(2), volume, amount.toFixed(2),
          ma5.toFixed(2), ma10.toFixed(2), ma20.toFixed(2), ma60.toFixed(2),
          macdVal.toFixed(4), macdSignal.toFixed(4), macdHist.toFixed(4),
          rsi6.toFixed(2), rsi12.toFixed(2), rsi24.toFixed(2),
          kdjK.toFixed(2), kdjD.toFixed(2), kdjJ.toFixed(2),
          bollUpper.toFixed(2), bollMid.toFixed(2), bollLower.toFixed(2)
        ]
      );
    }

    console.log(`✅ 创建60天K线数据: ${stockCode}`);

    // 创建资金流向数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  创建资金流向数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (let i = 9; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const tradeDate = date.toISOString().split('T')[0];

      // 模拟资金流向（大部分流入）
      const mainNet = (Math.random() > 0.4) ?
        Math.random() * 50000000 : // 流入
        -Math.random() * 30000000; // 流出

      const mainInflow = mainNet > 0 ? mainNet : 0;
      const mainOutflow = mainNet < 0 ? Math.abs(mainNet) : 0;

      const superNet = mainNet * (0.4 + Math.random() * 0.2);
      const superInflow = superNet > 0 ? superNet : 0;
      const superOutflow = superNet < 0 ? Math.abs(superNet) : 0;

      const largeNet = mainNet * (0.2 + Math.random() * 0.1);
      const largeInflow = largeNet > 0 ? largeNet : 0;
      const largeOutflow = largeNet < 0 ? Math.abs(largeNet) : 0;

      const mediumNet = mainNet * (-0.1 + Math.random() * 0.2);
      const mediumInflow = mediumNet > 0 ? mediumNet : 0;
      const mediumOutflow = mediumNet < 0 ? Math.abs(mediumNet) : 0;

      const smallNet = mainNet * (0.1 + Math.random() * 0.1);
      const smallInflow = smallNet > 0 ? smallNet : 0;
      const smallOutflow = smallNet < 0 ? Math.abs(smallNet) : 0;

      await pool.query(
        `INSERT INTO fund_flow (
          stock_code, trade_date, main_inflow, main_outflow, main_net, main_net_ratio,
          superlarge_inflow, superlarge_outflow, superlarge_net,
          large_inflow, large_outflow, large_net,
          medium_inflow, medium_outflow, medium_net,
          small_inflow, small_outflow, small_net
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (stock_code, trade_date) DO NOTHING`,
        [
          stockCode, tradeDate,
          mainInflow.toFixed(2), mainOutflow.toFixed(2), mainNet.toFixed(2),
          (mainNet / 100000000).toFixed(4),
          superInflow.toFixed(2), superOutflow.toFixed(2), superNet.toFixed(2),
          largeInflow.toFixed(2), largeOutflow.toFixed(2), largeNet.toFixed(2),
          mediumInflow.toFixed(2), mediumOutflow.toFixed(2), mediumNet.toFixed(2),
          smallInflow.toFixed(2), smallOutflow.toFixed(2), smallNet.toFixed(2)
        ]
      );
    }

    console.log(`✅ 创建10天资金流向数据: ${stockCode}`);

    // 验证数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  验证数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const marketCount = await pool.query('SELECT COUNT(*) FROM market_data WHERE stock_code = $1', [stockCode]);
    const flowCount = await pool.query('SELECT COUNT(*) FROM fund_flow WHERE stock_code = $1', [stockCode]);

    console.log(`\n市场数据: ${marketCount.rows[0].count}条`);
    console.log(`资金流向: ${flowCount.rows[0].count}条`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 测试数据创建完成!');
    console.log('\n💡 现在可以运行评分系统测试了');
    console.log('');

  } catch (error) {
    console.error('\n❌ 创建测试数据失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行
createTestData()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
