/**
 * 综合功能测试脚本
 * 测试所有核心功能和API端点
 */

const http = require('http');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(category, message, status = 'info') {
  const color = status === 'success' ? colors.green :
                status === 'error' ? colors.red :
                status === 'warning' ? colors.yellow : colors.blue;
  console.log(`${color}[${category}]${colors.reset} ${message}`);
}

// HTTP请求辅助函数
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
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// 测试函数
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          🧪 AI投资决策助手 - 综合功能测试             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // ==================== v1 API Tests ====================
  log('TEST', '开始 v1 API 测试...', 'info');

  const v1Tests = [
    {
      name: '健康检查',
      path: '/',
      expectedStatus: 200
    },
    {
      name: '获取新闻列表',
      path: '/api/v1/news',
      expectedStatus: 200
    },
    {
      name: '获取市场数据',
      path: '/api/v1/market?stock=000001.SZ',
      expectedStatus: 200
    },
    {
      name: 'AI聊天',
      path: '/api/v1/ai/chat',
      method: 'POST',
      body: { message: '分析平安银行的走势' },
      expectedStatus: 200
    },
    {
      name: '获取公告统计',
      path: '/api/v1/bulletins/stats?days=7',
      expectedStatus: 200
    }
  ];

  for (const test of v1Tests) {
    totalTests++;
    try {
      const result = await request(3001, test.path, test.method || 'GET', test.body || null);
      if (result.status === test.expectedStatus) {
        passedTests++;
        log('PASS', `v1 - ${test.name}`, 'success');
      } else {
        failedTests++;
        log('FAIL', `v1 - ${test.name} (expected ${test.expectedStatus}, got ${result.status})`, 'error');
      }
    } catch (error) {
      failedTests++;
      log('ERROR', `v1 - ${test.name}: ${error.message}`, 'error');
    }
  }

  // ==================== v2 API Tests ====================
  log('TEST', '\n开始 v2 API 测试...', 'info');

  const v2Tests = [
    {
      name: '健康检查',
      path: '/health',
      expectedStatus: 200
    },
    {
      name: 'v2版本信息',
      path: '/api/v2/health',
      expectedStatus: 200
    },
    {
      name: '监控状态',
      path: '/api/v2/monitoring/status',
      expectedStatus: 200
    },
    {
      name: '生成投资决策',
      path: '/api/v2/decision/generate',
      method: 'POST',
      body: { stockCode: '000001.SZ' },
      expectedStatus: 200
    },
    {
      name: '批量决策',
      path: '/api/v2/decision/batch',
      method: 'POST',
      body: { stockCodes: ['000001.SZ', '600519.SH'] },
      expectedStatus: 200
    }
  ];

  for (const test of v2Tests) {
    totalTests++;
    try {
      const result = await request(3002, test.path, test.method || 'GET', test.body || null);
      if (result.status === test.expectedStatus) {
        passedTests++;
        log('PASS', `v2 - ${test.name}`, 'success');
      } else {
        failedTests++;
        log('FAIL', `v2 - ${test.name} (expected ${test.expectedStatus}, got ${result.status})`, 'error');
      }
    } catch (error) {
      failedTests++;
      log('ERROR', `v2 - ${test.name}: ${error.message}`, 'error');
    }
  }

  // ==================== 决策引擎详细测试 ====================
  log('TEST', '\n开始决策引擎详细测试...', 'info');

  try {
    const DecisionEngine = require('../services/decision/decision-engine');
    const decisionEngine = new DecisionEngine();

    totalTests++;
    const decision = await decisionEngine.generateDecision('000001.SZ');

    if (decision && decision.decision && decision.action) {
      passedTests++;
      log('PASS', '决策引擎 - 生成决策', 'success');
      log('INFO', `  决策: ${decision.decision} - ${decision.action}`, 'info');
      log('INFO', `  综合评分: ${decision.totalScore.toFixed(2)}`, 'info');
      log('INFO', `  技术面: ${decision.technicalScore.toFixed(2)}`, 'info');
      log('INFO', `  资金面: ${decision.fundFlowScore.toFixed(2)}`, 'info');
      log('INFO', `  消息面: ${decision.newsScore.toFixed(2)}`, 'info');
      log('INFO', `  板块面: ${decision.sectorScore.toFixed(2)}`, 'info');
      log('INFO', `  风险等级: ${decision.riskLevel}`, 'info');
      log('INFO', `  置信度: ${(decision.confidence * 100).toFixed(0)}%`, 'info');
    } else {
      failedTests++;
      log('FAIL', '决策引擎 - 缺少必要字段', 'error');
    }
  } catch (error) {
    failedTests++;
    log('ERROR', `决策引擎: ${error.message}`, 'error');
  }

  // ==================== 评分服务测试 ====================
  log('TEST', '\n开始评分服务测试...', 'info');

  try {
    const ScoringService = require('../services/scoring/scoring-service');
    const scoringService = new ScoringService();

    totalTests++;
    const score = await scoringService.calculateOverallScore('000001.SZ');

    if (score && score.overallScore && score.grade) {
      passedTests++;
      log('PASS', '评分服务 - 计算综合评分', 'success');
      log('INFO', `  综合评分: ${score.overallScore.toFixed(2)} (${score.grade}级)`, 'info');
      log('INFO', `  技术面: ${score.technicalScore.toFixed(2)}`, 'info');
      log('INFO', `  资金面: ${score.fundFlowScore.toFixed(2)}`, 'info');
      log('INFO', `  消息面: ${score.newsScore.toFixed(2)}`, 'info');
      log('INFO', `  板块面: ${score.sectorScore.toFixed(2)}`, 'info');
    } else {
      failedTests++;
      log('FAIL', '评分服务 - 缺少必要字段', 'error');
    }
  } catch (error) {
    failedTests++;
    log('ERROR', `评分服务: ${error.message}`, 'error');
  }

  // ==================== 测试结果汇总 ====================
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    测试结果汇总                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log(`总测试数: ${totalTests}`);
  console.log(`${colors.green}通过: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}失败: ${failedTests}${colors.reset}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (passedTests === totalTests) {
    log('SUCCESS', '🎉 所有测试通过！系统运行正常。', 'success');
    process.exit(0);
  } else {
    log('WARNING', '⚠️  部分测试失败，请检查上述错误信息。', 'warning');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  log('ERROR', `测试脚本执行失败: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
