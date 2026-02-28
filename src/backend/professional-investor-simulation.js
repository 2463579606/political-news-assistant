/**
 * 专业投资人测试模拟脚本
 * 10名一二级市场投资人对系统进行全面测试
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3002/api/v2';

// 10名专业投资人角色定义
const professionalInvestors = [
  {
    id: 1,
    name: "张总",
    title: "一级市场VC合伙人",
    experience: "12年",
    focus: "TMT、医疗健康早期投资",
    expertise: ["估值建模", "行业研究", "财务分析"],
    skepticism: 8, // 1-10, 对AI的怀疑程度
    testStocks: ["600519.SH", "000002.SZ"], // 贵州茅台、万科A
    expectations: ["基本面分析准确", "行业趋势判断", "估值合理性"]
  },
  {
    id: 2,
    name: "李总",
    title: "二级市场私募基金经理",
    experience: "15年",
    focus: "价值投资、长期持有",
    expertise: ["财务报表分析", "估值模型", "风险管理"],
    skepticism: 7,
    testStocks: ["600036.SH", "000001.SZ"], // 招商银行、平安银行
    expectations: ["低估值标的发现", "安全边际", "长期价值"]
  },
  {
    id: 3,
    name: "王总",
    title: "量化投资总监",
    experience: "10年",
    focus: "多因子选股、高频交易",
    expertise: ["量化模型", "技术指标", "回测验证"],
    skepticism: 9, // 量化专家，对AI要求极高
    testStocks: ["000001.SZ", "600000.SH"], // 平安银行、浦发银行
    expectations: ["技术指标准确性", "回测数据完整", "信号有效性"]
  },
  {
    id: 4,
    name: "陈总",
    title: "券商首席分析师",
    experience: "18年",
    focus: "宏观策略、行业配置",
    expertise: ["宏观经济", "政策解读", "行业轮动"],
    skepticism: 6,
    testStocks: ["600519.SH", "000001.SZ"], // 茅台、平安银行
    expectations: ["宏观因素考量", "行业配置建议", "风险提示"]
  },
  {
    id: 5,
    name: "刘总",
    title: "险资投资经理",
    experience: "11年",
    focus: "固定收益+、绝对收益",
    expertise: ["风险控制", "资产配置", "久期管理"],
    skepticism: 7,
    testStocks: ["600036.SH", "601318.SH"], // 招商银行、中国平安
    expectations: ["风险控制严格", "回撤控制", "稳健收益"]
  },
  {
    id: 6,
    name: "赵总",
    title: "PE投资总监",
    experience: "14年",
    focus: "成长期企业投资、并购",
    expertise: ["尽职调查", "财务分析", "估值谈判"],
    skepticism: 8,
    testStocks: ["000002.SZ", "600000.SH"], // 万科A、浦发银行
    expectations: ["企业质量评估", "成长性判断", "估值合理性"]
  },
  {
    id: 7,
    name: "孙总",
    title: "游资大佬",
    experience: "8年",
    focus: "短线交易、题材炒作",
    expertise: ["盘口分析", "资金流向", "情绪判断"],
    skepticism: 5, // 更愿意尝试新工具
    testStocks: ["000001.SZ", "600036.SH"], // 平安银行、招商银行
    expectations: ["短线信号准确", "资金流向及时", "热点捕捉"]
  },
  {
    id: 8,
    name: "周总",
    title: "家族办公室投资总监",
    experience: "20年",
    focus: "资产配置、财富传承",
    expertise: ["资产配置", "风险管理", "长期规划"],
    skepticism: 7,
    testStocks: ["600519.SH", "600036.SH"], // 茅台、招商银行
    expectations: ["风险收益平衡", "资产配置建议", "长期价值"]
  },
  {
    id: 9,
    name: "吴总",
    title: "公募基金经理",
    experience: "13年",
    focus: "消费升级、品质生活",
    expertise: ["行业研究", "公司调研", "估值判断"],
    skepticism: 6,
    testStocks: ["600519.SH", "000002.SZ"], // 茅台、万科A
    expectations: ["行业趋势", "公司质量", "估值合理性"]
  },
  {
    id: 10,
    name: "郑总",
    title: "天使投资人",
    experience: "9年",
    focus: "早期科技项目投资",
    expertise: ["商业模式", "团队判断", "市场洞察"],
    skepticism: 8,
    testStocks: ["600036.SH", "000001.SZ"], // 招商银行、平安银行
    expectations: ["创新发现", "成长性", "风险评估"]
  }
];

// 测试函数集合
const tests = {
  // 测试1: 生成决策
  async testDecisionGeneration(stockCode) {
    try {
      const response = await axios.post(`${API_BASE}/decision/generate`, {
        stockCode: stockCode,
        useCache: false
      });
      return {
        success: response.data.success,
        data: response.data.data,
        hasDecision: !!response.data.data?.decision,
        hasScores: !!(response.data.data?.technicalScore &&
                      response.data.data?.fundamentalScore &&
                      response.data.data?.newsScore),
        hasReasoning: !!response.data.data?.reason,
        confidence: response.data.data?.confidence || 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 测试2: 获取图表数据
  async testChartData(stockCode) {
    try {
      const response = await axios.get(`${API_BASE}/chart/data`, {
        params: { stockCode, days: 60 }
      });
      return {
        success: response.data.success,
        hasKline: !!response.data.data?.kline?.length,
        hasRSI: !!response.data.data?.rsi?.length,
        hasMACD: !!response.data.data?.macd?.length,
        klineDataPoints: response.data.data?.kline?.length || 0,
        hasMA5: response.data.data?.kline?.[0]?.ma5 != null,
        hasMA20: response.data.data?.kline?.[0]?.ma20 != null
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 测试3: 历史回测
  async testBacktest(stockCode) {
    try {
      const response = await axios.post(`${API_BASE}/backtest/create`, {
        stockCode: stockCode,
        startDate: '2024-10-01',
        endDate: '2024-12-27',
        initialCapital: 1000000,
        saveToDb: false
      });
      const data = response.data.data;
      return {
        success: response.data.success,
        hasPerformance: !!data?.performance,
        totalReturn: data?.performance?.return?.totalReturnPercent,
        maxDrawdown: data?.performance?.risk?.maxDrawdownPercent,
        sharpeRatio: data?.performance?.risk?.sharpeRatio,
        tradeCount: data?.performance?.trade?.totalTrades,
        winRate: data?.performance?.trade?.winRatePercent
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 测试4: 历史决策记录
  async testDecisionHistory(stockCode) {
    try {
      const response = await axios.get(`${API_BASE}/decision/history`, {
        params: { stockCode, limit: 10 }
      });
      return {
        success: response.data.success,
        historyCount: response.data.data?.length || 0,
        hasVariety: new Set(response.data.data?.map(d => d.decision_type)).size > 1
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // 测试5: 技术指标准确性验证
  async validateTechnicalIndicators(stockCode) {
    try {
      const response = await axios.get(`${API_BASE}/chart/data`, {
        params: { stockCode, days: 60 }
      });
      const kline = response.data.data?.kline || [];

      // 验证MA5计算
      const sampleIdx = 10; // 选取第10天数据
      if (sampleIdx >= kline.length) return { success: false, error: 'Insufficient data' };

      const manualMA5 = kline.slice(sampleIdx - 4, sampleIdx + 1)
        .reduce((sum, d) => sum + parseFloat(d.close), 0) / 5;
      const systemMA5 = parseFloat(kline[sampleIdx].ma5);

      const isMA5Accurate = Math.abs(manualMA5 - systemMA5) < 0.01;

      return {
        success: true,
        ma5Accuracy: isMA5Accurate,
        manualMA5: manualMA5.toFixed(2),
        systemMA5: systemMA5?.toFixed(2),
        errorMargin: Math.abs(manualMA5 - systemMA5).toFixed(4)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// 执行完整测试流程
async function runProfessionalTest() {
  console.log('='.repeat(80));
  console.log('🔍 专业投资人系统测试报告');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(80));
  console.log();

  const allResults = [];

  for (const investor of professionalInvestors) {
    console.log('━'.repeat(80));
    console.log(`👤 投资人 #${investor.id}: ${investor.name} - ${investor.title}`);
    console.log(`   经验: ${investor.experience} | 关注: ${investor.focus}`);
    console.log(`   专业领域: ${investor.expertise.join(', ')}`);
    console.log(`   怀疑程度: ${investor.skepticism}/10 (越高越难说服)`);
    console.log();

    const testStock = investor.testStocks[0];
    const investorResults = {
      investor: investor,
      tests: {},
      feedback: [],
      rating: 0
    };

    // 测试1: 决策生成
    console.log(`   📊 测试1: 决策生成 (${testStock})`);
    const decisionTest = await tests.testDecisionGeneration(testStock);
    investorResults.tests.decision = decisionTest;

    if (decisionTest.success) {
      console.log(`      ✅ 成功生成决策`);
      console.log(`      决策类型: ${decisionTest.data.decision}`);
      console.log(`      置信度: ${(decisionTest.confidence * 100).toFixed(1)}%`);
      console.log(`      技术面: ${decisionTest.data.technicalScore.toFixed(1)}分`);
      console.log(`      基本面: ${decisionTest.data.fundamentalScore.toFixed(1)}分`);
      console.log(`      消息面: ${decisionTest.data.newsScore.toFixed(1)}分`);
      console.log(`      AI推理: ${decisionTest.data.reasoning?.substring(0, 50)}...`);

      // 根据投资人类型收集反馈
      if (investor.skepticism > 7) {
        if (decisionTest.confidence < 0.7) {
          investorResults.feedback.push(`置信度${(decisionTest.confidence * 100).toFixed(1)}%偏低，需要更多数据支撑`);
        }
      }

      if (decisionTest.data.fundamentalScore === 50) {
        investorResults.feedback.push(`基本面评分为默认值50分，需要实际财务数据`);
      }
    } else {
      console.log(`      ❌ 决策生成失败: ${decisionTest.error}`);
      investorResults.feedback.push(`系统稳定性问题: ${decisionTest.error}`);
    }
    console.log();

    // 测试2: 图表数据
    console.log(`   📈 测试2: 图表数据`);
    const chartTest = await tests.testChartData(testStock);
    investorResults.tests.chart = chartTest;

    if (chartTest.success) {
      console.log(`      ✅ 图表数据获取成功`);
      console.log(`      K线数据点: ${chartTest.klineDataPoints}个`);
      console.log(`      RSI指标: ${chartTest.hasRSI ? '✅' : '❌'}`);
      console.log(`      MACD指标: ${chartTest.hasMACD ? '✅' : '❌'}`);
      console.log(`      MA5均线: ${chartTest.hasMA5 ? '✅' : '❌'}`);
      console.log(`      MA20均线: ${chartTest.hasMA20 ? '✅' : '❌'}`);

      // 量化专家特别关注
      if (investor.expertise.includes('技术指标')) {
        if (!chartTest.hasRSI || !chartTest.hasMACD) {
          investorResults.feedback.push(`技术指标不够完整，缺少布林带、KDJ等`);
        }
        if (chartTest.klineDataPoints < 60) {
          investorResults.feedback.push(`历史数据不足60天，影响技术分析准确性`);
        }
      }
    } else {
      console.log(`      ❌ 图表数据失败: ${chartTest.error}`);
    }
    console.log();

    // 测试3: 技术指标准确性验证
    console.log(`   🔬 测试3: 技术指标准确性验证`);
    const validationTest = await tests.validateTechnicalIndicators(testStock);
    investorResults.tests.validation = validationTest;

    if (validationTest.success) {
      console.log(`      MA5手动计算: ${validationTest.manualMA5}`);
      console.log(`      MA5系统计算: ${validationTest.systemMA5}`);
      console.log(`      误差: ${validationTest.errorMargin}`);
      console.log(`      准确性: ${validationTest.ma5Accuracy ? '✅ 准确' : '❌ 不准确'}`);

      if (!validationTest.ma5Accuracy) {
        investorResults.feedback.push(`MA5计算存在误差，影响技术分析可信度`);
      }
    } else {
      console.log(`      ⚠️  无法验证准确性`);
    }
    console.log();

    // 测试4: 历史回测
    console.log(`   🔄 测试4: 历史回测 (2024-10-01 ~ 2024-12-27)`);
    const backtestTest = await tests.testBacktest(testStock);
    investorResults.tests.backtest = backtestTest;

    if (backtestTest.success) {
      console.log(`      ✅ 回测完成`);
      console.log(`      总收益率: ${backtestTest.totalReturn || 'N/A'}`);
      console.log(`      最大回撤: ${backtestTest.maxDrawdown || 'N/A'}`);
      console.log(`      夏普比率: ${backtestTest.sharpeRatio?.toFixed(2) || 'N/A'}`);
      console.log(`      交易次数: ${backtestTest.tradeCount || 0}次`);
      console.log(`      胜率: ${backtestTest.winRate || 'N/A'}`);

      // 专业投资人特别关注回测结果
      if (backtestTest.totalReturn && backtestTest.totalReturn.includes('-')) {
        investorResults.feedback.push(`回测期间亏损${backtestTest.totalReturn}，策略有效性存疑`);
      }
      if (!backtestTest.sharpeRatio || backtestTest.sharpeRatio < 1.5) {
        investorResults.feedback.push(`夏普比率${backtestTest.sharpeRatio?.toFixed(2)}偏低，风险调整后收益不佳`);
      }
      if (backtestTest.maxDrawdown && backtestTest.maxDrawdown.includes('%')) {
        const dd = parseFloat(backtestTest.maxDrawdown);
        if (dd > 20) {
          investorResults.feedback.push(`最大回撤${backtestTest.maxDrawdown}偏大，风险控制不足`);
        }
      }
    } else {
      console.log(`      ❌ 回测失败: ${backtestTest.error}`);
    }
    console.log();

    // 测试5: 历史决策记录
    console.log(`   📜 测试5: 历史决策记录`);
    const historyTest = await tests.testDecisionHistory(testStock);
    investorResults.tests.history = historyTest;

    if (historyTest.success) {
      console.log(`      ✅ 历史记录获取成功`);
      console.log(`      决策数量: ${historyTest.historyCount}条`);
      console.log(`      决策多样性: ${historyTest.hasVariety ? '✅ 有变化' : '❌ 单一'}`);

      if (historyTest.historyCount < 5) {
        investorResults.feedback.push(`历史决策记录不足，样本量太小`);
      }
    } else {
      console.log(`      ⚠️  暂无历史记录`);
    }
    console.log();

    // 综合评分
    console.log(`   📝 综合评价:`);

    let score = 0;
    let maxScore = 0;

    // 1. 决策质量 (30分)
    maxScore += 30;
    if (decisionTest.success) {
      score += decisionTest.confidence * 15; // 置信度 0-15分
      score += decisionTest.hasReasoning ? 10 : 0; // 推理 10分
      score += decisionTest.data?.fundamentalScore > 50 ? 5 : 0; // 基本面 5分
    }

    // 2. 技术指标 (25分)
    maxScore += 25;
    if (chartTest.success) {
      score += chartTest.hasKline ? 5 : 0;
      score += chartTest.hasRSI ? 5 : 0;
      score += chartTest.hasMACD ? 5 : 0;
      score += chartTest.hasMA5 && chartTest.hasMA20 ? 5 : 0;
      score += validationTest.ma5Accuracy ? 5 : 0;
    }

    // 3. 回测验证 (25分)
    maxScore += 25;
    if (backtestTest.success) {
      if (backtestTest.totalReturn) {
        const ret = parseFloat(backtestTest.totalReturn);
        score += ret > 0 ? 10 : 5;
      }
      score += backtestTest.sharpeRatio > 1.5 ? 10 : (backtestTest.sharpeRatio > 1 ? 5 : 0);
      score += backtestTest.tradeCount > 5 ? 5 : 0;
    }

    // 4. 系统稳定性 (20分)
    maxScore += 20;
    score += decisionTest.success ? 5 : 0;
    score += chartTest.success ? 5 : 0;
    score += backtestTest.success ? 5 : 0;
    score += historyTest.success ? 5 : 0;

    investorResults.rating = (score / maxScore * 100).toFixed(1);

    console.log(`      综合评分: ${investorResults.rating}/100`);

    // 根据评分生成评价
    if (investorResults.rating >= 80) {
      console.log(`      评价: ⭐⭐⭐⭐⭐ 优秀，超出预期`);
      investorResults.feedback.push(`系统整体表现优秀，${investor.expertise[0]}准确度高`);
    } else if (investorResults.rating >= 70) {
      console.log(`      评价: ⭐⭐⭐⭐ 良好，符合预期`);
      investorResults.feedback.push(`系统表现良好，但仍有改进空间`);
    } else if (investorResults.rating >= 60) {
      console.log(`      评价: ⭐⭐⭐ 及格，基本可用`);
      investorResults.feedback.push(`系统基本可用，但需要大幅改进`);
    } else {
      console.log(`      评价: ⭐⭐ 不及格，不可用`);
      investorResults.feedback.push(`系统存在严重问题，不建议使用`);
    }

    console.log();
    console.log(`   💬 具体反馈:`);
    investorResults.feedback.forEach((fb, idx) => {
      console.log(`      ${idx + 1}. ${fb}`);
    });

    if (investorResults.feedback.length === 0) {
      console.log(`      (无特别反馈)`);
    }

    console.log();
    allResults.push(investorResults);

    // 延迟避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 生成总结报告
  console.log('='.repeat(80));
  console.log('📊 测试总结报告');
  console.log('='.repeat(80));
  console.log();

  const avgRating = allResults.reduce((sum, r) => sum + parseFloat(r.rating), 0) / allResults.length;
  console.log(`平均评分: ${avgRating.toFixed(1)}/100`);

  const ratingDistribution = {
    excellent: allResults.filter(r => parseFloat(r.rating) >= 80).length,
    good: allResults.filter(r => parseFloat(r.rating) >= 70 && parseFloat(r.rating) < 80).length,
    pass: allResults.filter(r => parseFloat(r.rating) >= 60 && parseFloat(r.rating) < 70).length,
    fail: allResults.filter(r => parseFloat(r.rating) < 60).length
  };
  console.log(`评分分布:`);
  console.log(`  ⭐⭐⭐⭐⭐ (80+): ${ratingDistribution.excellent}人`);
  console.log(`  ⭐⭐⭐⭐ (70-79): ${ratingDistribution.good}人`);
  console.log(`  ⭐⭐⭐ (60-69): ${ratingDistribution.pass}人`);
  console.log(`  ⭐⭐ (<60): ${ratingDistribution.fail}人`);
  console.log();

  // 收集所有反馈
  const allFeedback = allResults.flatMap(r => r.feedback);
  const feedbackSummary = {};

  allFeedback.forEach(fb => {
    const key = fb.split(':')[0];
    if (!feedbackSummary[key]) {
      feedbackSummary[key] = [];
    }
    feedbackSummary[key].push(fb);
  });

  console.log('主要问题汇总 (按提及次数排序):');
  const sortedIssues = Object.entries(feedbackSummary)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  sortedIssues.forEach(([issue, instances], idx) => {
    console.log(`  ${idx + 1}. ${issue} (${instances.length}人提及)`);
  });

  console.log();
  console.log('='.repeat(80));

  return {
    averageRating: avgRating,
    distribution: ratingDistribution,
    allResults: allResults,
    topIssues: sortedIssues
  };
}

// 导出
module.exports = { runProfessionalTest, professionalInvestors, tests };

// 如果直接运行此文件
if (require.main === module) {
  runProfessionalTest()
    .then(result => {
      console.log('\n测试完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试出错:', error);
      process.exit(1);
    });
}
