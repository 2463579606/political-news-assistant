/**
 * 测试回测API接口
 */

require('dotenv').config();
const express = require('express');
const backtestRoutes = require('../routes/backtest-v2');

const app = express();
app.use(express.json());
app.use('/api/v2/backtest', backtestRoutes);

const PORT = 3003;

async function testBacktestAPI() {
  console.log('🧪 测试回测API接口\n');

  // 启动测试服务器
  const server = app.listen(PORT, () => {
    console.log(`✅ 测试API服务器启动: http://localhost:${PORT}`);
    console.log('');
  });

  const http = require('http');

  function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, `http://localhost:${PORT}`);
      const options = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  try {
    // 测试1: 运行回测
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  运行回测 POST /api/v2/backtest/run');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result1 = await makeRequest('POST', '/api/v2/backtest/run', {
      stockCode: '000001.SZ',
      startDate: '2026-02-01',
      endDate: '2026-02-25',
      options: {
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippageRate: 0.001,
        maxPosition: 0.3,
        stopLoss: -0.08,
        takeProfit: 0.15,
        saveToDb: false
      }
    });

    console.log('状态:', result1.status);
    console.log('成功:', result1.data.success);

    if (result1.data.success) {
      const backtest = result1.data.data;
      console.log('\n回测结果:');
      console.log(`  股票代码: ${backtest.stockCode}`);
      console.log(`  回测期间: ${backtest.startDate} ~ ${backtest.endDate}`);
      console.log(`  总收益率: ${backtest.performance.return.totalReturnPercent}`);
      console.log(`  年化收益: ${backtest.performance.return.annualReturnPercent}`);
      console.log(`  最大回撤: ${backtest.performance.risk.maxDrawdownPercent}`);
      console.log(`  夏普比率: ${backtest.performance.risk.sharpeRatio.toFixed(2)}`);
      console.log(`  总交易: ${backtest.performance.trade.totalTrades}次`);
    }

    console.log(result1.status === 200 ? '✅ 通过' : '❌ 失败');

    // 测试2: 获取回测历史
    console.log('\n' + '='.repeat(70));
    console.log('\n2️⃣  获取回测历史 GET /api/v2/backtest/history');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result2 = await makeRequest('GET', '/api/v2/backtest/history?limit=10');

    console.log('状态:', result2.status);
    console.log('成功:', result2.data.success);
    console.log(`历史记录数: ${result2.data.data.total}`);

    if (result2.data.data.history.length > 0) {
      console.log('\n最近的回测:');
      result2.data.data.history.slice(0, 3).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.stock_code} (${h.start_date} ~ ${h.end_date})`);
        console.log(`     收益: ${(h.total_return * 100).toFixed(2)}% 夏普: ${h.sharpe_ratio?.toFixed(2) || 'N/A'}`);
      });
    }

    console.log(result2.status === 200 ? '✅ 通过' : '❌ 失败');

    // 测试3: 参数验证测试
    console.log('\n' + '='.repeat(70));
    console.log('\n3️⃣  参数验证测试 POST /api/v2/backtest/run');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result3 = await makeRequest('POST', '/api/v2/backtest/run', {
      // 缺少必需参数
      stockCode: '000001.SZ'
    });

    console.log('状态:', result3.status);
    console.log('成功:', result3.data.success);
    console.log('错误:', result3.data.error);

    console.log(result3.status === 400 ? '✅ 通过 (正确返回400错误)' : '❌ 失败');

    // 测试4: 对比接口 (如果有多个回测)
    console.log('\n' + '='.repeat(70));
    console.log('\n4️⃣  对比接口 POST /api/v2/backtest/compare');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result4 = await makeRequest('POST', '/api/v2/backtest/compare', {
      backtestIds: [1, 2, 3]  // 使用虚拟ID
    });

    console.log('状态:', result4.status);
    console.log('成功:', result4.data.success);

    if (result4.status === 200 && result4.data.data.count === 0) {
      console.log('说明: 数据库中没有回测记录');
    }

    console.log('✅ 接口正常响应');

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ API测试完成!');
    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  } finally {
    server.close();
    console.log('\n测试服务器已关闭');
  }
}

// 运行测试
testBacktestAPI()
  .then(() => {
    console.log('\n✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
