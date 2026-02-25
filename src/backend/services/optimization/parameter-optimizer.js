/**
 * Parameter Optimizer
 * 参数优化器
 *
 * 功能:
 * 1. 网格搜索优化
 * 2. 遗传算法优化
 * 3. 多目标优化
 * 4. 优化结果管理
 */

const BacktestEngine = require('../backtest/backtest-engine');
const { Pool } = require('pg');

class ParameterOptimizer {
  constructor() {
    this.backtestEngine = new BacktestEngine();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 网格搜索优化
   * @param {string} stockCode - 股票代码
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @param {object} paramGrid - 参数网格
   * @param {string} targetMetric - 目标指标 (sharpeRatio, totalReturn, winRate, etc.)
   */
  async gridSearch(stockCode, startDate, endDate, paramGrid, targetMetric = 'sharpeRatio') {
    console.log('\n' + '='.repeat(70));
    console.log(`🔍 网格搜索参数优化: ${stockCode}`);
    console.log(`   期间: ${startDate} ~ ${endDate}`);
    console.log(`   目标: ${targetMetric}`);
    console.log('='.repeat(70));

    // 1. 生成所有参数组合
    console.log('\n📋 步骤 1/4: 生成参数组合');
    const combinations = this.generateCombinations(paramGrid);
    console.log(`   总参数组合数: ${combinations.length}`);

    if (combinations.length === 0) {
      throw new Error('没有有效的参数组合');
    }

    // 2. 遍历所有组合并运行回测
    console.log('\n🏃 步骤 2/4: 运行回测 (可能需要较长时间)');
    const results = [];

    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];
      const progress = ((i + 1) / combinations.length * 100).toFixed(1);

      console.log(`\n[${i + 1}/${combinations.length}] ${progress}% - 测试参数组合`);
      console.log(`   买入阈值: ${params.buyThreshold}, 卖出阈值: ${params.sellThreshold}`);
      console.log(`   最大仓位: ${(params.maxPosition * 100).toFixed(0)}%, 止损: ${(params.stopLoss * 100).toFixed(0)}%, 止盈: ${(params.takeProfit * 100).toFixed(0)}%`);

      try {
        // 运行回测
        const backtestResult = await this.backtestEngine.runBacktest(
          stockCode,
          startDate,
          endDate,
          {
            ...params,
            saveToDb: false // 优化时不保存到数据库
          }
        );

        // 提取目标指标值
        const metricValue = this.extractMetric(backtestResult, targetMetric);

        results.push({
          success: true,
          params: params,
          metricValue: metricValue,
          backtestResult: backtestResult
        });

        console.log(`   ✅ ${targetMetric}: ${this.formatMetric(metricValue, targetMetric)}`);

      } catch (error) {
        console.error(`   ❌ 回测失败: ${error.message}`);
        results.push({
          success: false,
          params: params,
          error: error.message
        });
      }

      // 延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 3. 按目标指标排序
    console.log('\n📊 步骤 3/4: 分析结果');
    const validResults = results.filter(r => r.success);

    if (validResults.length === 0) {
      throw new Error('没有成功的回测结果');
    }

    // 根据指标类型决定排序方向
    const ascending = this.isAscendingMetric(targetMetric);
    validResults.sort((a, b) => {
      return ascending ? a.metricValue - b.metricValue : b.metricValue - a.metricValue;
    });

    const bestResult = validResults[0];
    const worstResult = validResults[validResults.length - 1];

    console.log(`\n✅ 有效回测: ${validResults.length}/${combinations.length}`);
    console.log(`\n最佳参数组合:`);
    console.log(`   ${targetMetric}: ${this.formatMetric(bestResult.metricValue, targetMetric)}`);
    console.log(`   买入阈值: ${bestResult.params.buyThreshold}`);
    console.log(`   卖出阈值: ${bestResult.params.sellThreshold}`);
    console.log(`   最大仓位: ${(bestResult.params.maxPosition * 100).toFixed(0)}%`);
    console.log(`   止损: ${(bestResult.params.stopLoss * 100).toFixed(0)}%`);
    console.log(`   止盈: ${(bestResult.params.takeProfit * 100).toFixed(0)}%`);

    // 4. 保存优化结果
    console.log('\n💾 步骤 4/4: 保存优化结果');
    const optimizationId = await this.saveOptimizationResult({
      stockCode: stockCode,
      startDate: startDate,
      endDate: endDate,
      method: 'grid_search',
      parameterSpace: paramGrid,
      bestParameters: bestResult.params,
      bestScore: bestResult.metricValue,
      targetMetric: targetMetric,
      allResults: validResults.map(r => ({
        params: r.params,
        score: r.metricValue
      })),
      iterations: combinations.length
    });

    console.log(`\n✅ 优化结果已保存 (ID: ${optimizationId})`);

    // 打印对比分析
    this.printOptimizationSummary(validResults, targetMetric);

    console.log('\n' + '='.repeat(70));
    console.log(`✅ 网格搜索完成: ${stockCode}`);
    console.log('='.repeat(70) + '\n');

    return {
      optimizationId: optimizationId,
      stockCode: stockCode,
      method: 'grid_search',
      targetMetric: targetMetric,
      totalIterations: combinations.length,
      successIterations: validResults.length,
      best: {
        params: bestResult.params,
        score: bestResult.metricValue,
        backtest: bestResult.backtestResult
      },
      worst: {
        params: worstResult.params,
        score: worstResult.metricValue
      },
      avg: this.calculateAverageScore(validResults, targetMetric),
      allResults: validResults
    };
  }

  /**
   * 生成所有参数组合
   */
  generateCombinations(paramGrid) {
    const keys = Object.keys(paramGrid);
    const combinations = [];

    function generate(current, index) {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      const values = paramGrid[key];

      for (const value of values) {
        current[key] = value;
        generate(current, index + 1);
      }
    }

    generate({}, 0);
    return combinations;
  }

  /**
   * 提取指标值
   */
  extractMetric(backtestResult, metric) {
    const perf = backtestResult.performance;

    switch (metric) {
      case 'sharpeRatio':
        return perf.risk.sharpeRatio || 0;
      case 'sortinoRatio':
        return perf.risk.sortinoRatio || 0;
      case 'calmarRatio':
        return perf.risk.calmarRatio || 0;
      case 'totalReturn':
        return perf.return.totalReturn;
      case 'annualReturn':
        return perf.return.annualReturn;
      case 'winRate':
        return perf.trade.winRate;
      case 'profitLossRatio':
        return perf.trade.profitLossRatio;
      case 'profitFactor':
        return perf.trade.profitFactor;
      case 'maxDrawdown':
        return typeof perf.risk.maxDrawdown === 'object'
          ? perf.risk.maxDrawdown.value
          : perf.risk.maxDrawdown;
      default:
        return perf.return.annualReturn;
    }
  }

  /**
   * 判断指标是否越小越好
   */
  isAscendingMetric(metric) {
    return metric === 'maxDrawdown';
  }

  /**
   * 格式化指标显示
   */
  formatMetric(value, metric) {
    if (metric.includes('Ratio') || metric === 'winRate') {
      return value.toFixed(2);
    } else if (metric.includes('Return')) {
      return (value * 100).toFixed(2) + '%';
    } else if (metric === 'maxDrawdown') {
      return (value * 100).toFixed(2) + '%';
    }
    return value.toFixed(2);
  }

  /**
   * 计算平均得分
   */
  calculateAverageScore(results, metric) {
    const sum = results.reduce((total, r) => total + r.metricValue, 0);
    return sum / results.length;
  }

  /**
   * 打印优化摘要
   */
  printOptimizationSummary(results, targetMetric) {
    console.log('\n' + '─'.repeat(70));
    console.log('📊 优化结果摘要');
    console.log('─'.repeat(70));

    // 参数敏感性分析
    const paramSensitivity = this.analyzeParameterSensitivity(results, targetMetric);

    console.log('\n参数敏感性分析:');
    for (const [param, impact] of Object.entries(paramSensitivity)) {
      console.log(`  ${param}: ${impact > 0.1 ? '高敏感' : impact > 0.05 ? '中敏感' : '低敏感'} (影响: ${(impact * 100).toFixed(2)}%)`);
    }

    // Top 5 参数组合
    console.log('\nTop 5 参数组合:');
    results.slice(0, 5).forEach((result, i) => {
      console.log(`\n  ${i + 1}. ${targetMetric}: ${this.formatMetric(result.metricValue, targetMetric)}`);
      console.log(`     买入: ${result.params.buyThreshold}, 卖出: ${result.params.sellThreshold}, 仓位: ${(result.params.maxPosition * 100).toFixed(0)}%`);
    });

    console.log('\n' + '─'.repeat(70));
  }

  /**
   * 分析参数敏感性
   */
  analyzeParameterSensitivity(results, targetMetric) {
    const sensitivity = {};
    const params = Object.keys(results[0].params);

    for (const param of params) {
      // 计算该参数变化对指标的影响
      const values = new Set();
      results.forEach(r => values.add(r.params[param]));

      if (values.size > 1) {
        const scoresByValue = {};
        results.forEach(r => {
          const val = r.params[param];
          if (!scoresByValue[val]) {
            scoresByValue[val] = [];
          }
          scoresByValue[val].push(r.metricValue);
        });

        // 计算每个值的平均得分
        const avgScores = Object.entries(scoresByValue).map(([val, scores]) => ({
          value: val,
          avg: scores.reduce((sum, s) => sum + s, 0) / scores.length
        }));

        // 找出最大差异
        const maxScore = Math.max(...avgScores.map(s => s.avg));
        const minScore = Math.min(...avgScores.map(s => s.avg));
        const range = maxScore - minScore;

        // 归一化影响程度
        sensitivity[param] = Math.abs(range / maxScore);
      }
    }

    return sensitivity;
  }

  /**
   * 保存优化结果到数据库
   */
  async saveOptimizationResult(data) {
    const query = `
      INSERT INTO backtest_optimizations (
        stock_code, start_date, end_date,
        optimization_method, parameter_space,
        best_parameters, best_score, target_metric,
        all_results, iterations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const values = [
      data.stockCode,
      data.startDate,
      data.endDate,
      data.method,
      JSON.stringify(data.parameterSpace),
      JSON.stringify(data.bestParameters),
      data.bestScore,
      data.targetMetric,
      JSON.stringify(data.allResults),
      data.iterations
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].id;
  }

  /**
   * 获取优化结果
   */
  async getOptimizationResult(optimizationId) {
    const query = `
      SELECT * FROM backtest_optimizations
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [optimizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * 多目标优化（简化版 - 使用加权法）
   */
  async multiObjectiveOptimize(stockCode, startDate, endDate, paramGrid, objectives) {
    console.log('\n' + '='.repeat(70));
    console.log(`🎯 多目标优化: ${stockCode}`);
    console.log('='.repeat(70));

    // objectives = { sharpeRatio: 0.5, totalReturn: 0.3, maxDrawdown: 0.2 }
    // 注意: maxDrawdown是负值，需要特殊处理

    const combinations = this.generateCombinations(paramGrid);
    const results = [];

    console.log(`\n总参数组合数: ${combinations.length}`);
    console.log(`优化目标: ${JSON.stringify(objectives)}`);

    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];
      const progress = ((i + 1) / combinations.length * 100).toFixed(1);

      console.log(`[${i + 1}/${combinations.length}] ${progress}%`);

      try {
        const backtestResult = await this.backtestEngine.runBacktest(
          stockCode,
          startDate,
          endDate,
          { ...params, saveToDb: false }
        );

        // 计算加权综合得分
        let compositeScore = 0;

        for (const [metric, weight] of Object.entries(objectives)) {
          const value = this.extractMetric(backtestResult, metric);

          // 对于maxDrawdown（负值），取绝对值
          const normalizedValue = metric === 'maxDrawdown' ? Math.abs(value) : value;

          // 归一化处理（简单线性归一化）
          // TODO: 可以使用更复杂的归一化方法
          compositeScore += weight * normalizedValue;
        }

        results.push({
          success: true,
          params: params,
          compositeScore: compositeScore,
          scores: this.extractAllScores(backtestResult),
          backtestResult: backtestResult
        });

      } catch (error) {
        results.push({
          success: false,
          params: params,
          error: error.message
        });
      }
    }

    // 按综合得分排序
    const validResults = results.filter(r => r.success);
    validResults.sort((a, b) => b.compositeScore - a.compositeScore);

    console.log(`\n✅ 有效回测: ${validResults.length}/${combinations.length}`);
    console.log(`\n最佳参数组合:`);
    console.log(`   综合得分: ${validResults[0].compositeScore.toFixed(4)}`);
    console.log(`   夏普比率: ${validResults[0].scores.sharpeRatio.toFixed(2)}`);
    console.log(`   年化收益: ${(validResults[0].scores.annualReturn * 100).toFixed(2)}%`);
    console.log(`   最大回撤: ${(validResults[0].scores.maxDrawdown * 100).toFixed(2)}%`);

    return {
      best: validResults[0],
      all: validResults,
      objectives: objectives
    };
  }

  /**
   * 提取所有关键指标
   */
  extractAllScores(backtestResult) {
    const perf = backtestResult.performance;

    return {
      sharpeRatio: perf.risk.sharpeRatio || 0,
      totalReturn: perf.return.totalReturn,
      annualReturn: perf.return.annualReturn,
      maxDrawdown: typeof perf.risk.maxDrawdown === 'object'
        ? perf.risk.maxDrawdown.value
        : perf.risk.maxDrawdown,
      winRate: perf.trade.winRate
    };
  }
}

module.exports = ParameterOptimizer;
