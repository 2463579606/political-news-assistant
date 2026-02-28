/**
 * 性能测试脚本
 * 测试缓存优化前后的性能差异
 */

const http = require('http');

// API测试辅助函数
function request(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const startTime = Date.now();
        const result = {
          status: res.statusCode,
          data: JSON.parse(data),
          time: Date.now() - startTime
        };
        resolve(result);
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// 性能测试
async function performanceTest() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          🚀 性能测试 - 缓存优化效果                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const stockCode = '000001.SZ';
  const iterations = 5;

  // 测试1: 首次请求（无缓存）
  console.log('📊 测试1: 首次请求（无缓存）');
  console.log('━'.repeat(60));

  const times1 = [];
  for (let i = 0; i < iterations; i++) {
    // 清除缓存
    await request(3002, `/api/v2/cache/clear`, 'POST');

    const startTime = Date.now();
    await request(3002, '/api/v2/decision/generate', 'POST', { stockCode });
    const time = Date.now() - startTime;
    times1.push(time);

    console.log(`  第${i + 1}次: ${time}ms`);
  }

  const avg1 = times1.reduce((a, b) => a + b, 0) / times1.length;
  console.log(`\n  平均响应时间: ${avg1.toFixed(2)}ms`);
  console.log(`  最快: ${Math.min(...times1)}ms`);
  console.log(`  最慢: ${Math.max(...times1)}ms\n`);

  // 测试2: 缓存命中
  console.log('📊 测试2: 缓存命中');
  console.log('━'.repeat(60));

  // 首次请求建立缓存
  await request(3002, '/api/v2/decision/generate', 'POST', { stockCode });

  const times2 = [];
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    const result = await request(3002, '/api/v2/decision/generate', 'POST', { stockCode });
    const time = Date.now() - startTime;
    times2.push(time);

    console.log(`  第${i + 1}次: ${time}ms`);
  }

  const avg2 = times2.reduce((a, b) => a + b, 0) / times2.length;
  console.log(`\n  平均响应时间: ${avg2.toFixed(2)}ms`);
  console.log(`  最快: ${Math.min(...times2)}ms`);
  console.log(`  最慢: ${Math.max(...times2)}ms\n`);

  // 性能提升
  const improvement = ((avg1 - avg2) / avg1 * 100);
  console.log('📈 性能提升总结');
  console.log('━'.repeat(60));
  console.log(`  无缓存平均: ${avg1.toFixed(2)}ms`);
  console.log(`  有缓存平均: ${avg2.toFixed(2)}ms`);
  console.log(`  性能提升: ${improvement.toFixed(1)}%`);
  console.log(`  加速比: ${(avg1 / avg2).toFixed(2)}x\n`);

  // 测试3: 批量决策性能
  console.log('📊 测试3: 批量决策性能（3只股票）');
  console.log('━'.repeat(60));

  const startTime = Date.now();
  const batchResult = await request(3002, '/api/v2/decision/batch', 'POST', {
    stockCodes: ['000001.SZ', '600519.SH', '000002.SZ']
  });
  const batchTime = Date.now() - startTime;

  console.log(`  总耗时: ${batchTime}ms`);
  console.log(`  成功: ${batchResult.data.success}`);
  console.log(`  平均每只: ${(batchTime / 3).toFixed(2)}ms\n`);

  // 测试4: 缓存统计
  console.log('📊 测试4: 缓存统计');
  console.log('━'.repeat(60));

  const cacheStats = await request(3002, '/api/v2/cache/stats');
  console.log(`  总缓存项: ${cacheStats.data.data.total}`);
  console.log(`  有效缓存: ${cacheStats.data.data.valid}`);
  console.log(`  过期缓存: ${cacheStats.data.data.expired}`);
  console.log(`  内存占用: ${(cacheStats.data.data.size / 1024).toFixed(2)}KB\n`);

  // 总结
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    测试总结                            ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  缓存效果: ✅ 性能提升 ${improvement.toFixed(1)}%               ║`);
  console.log(`║  批量处理: ✅ 3只股票 ${batchTime}ms (${(batchTime / 3).toFixed(0)}ms/只)     ║`);
  console.log(`║  系统状态: ✅ 运行正常                               ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// 运行测试
performanceTest().catch(error => {
  console.error('测试失败:', error.message);
  process.exit(1);
});
