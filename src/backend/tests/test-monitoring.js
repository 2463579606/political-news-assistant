/**
 * 测试监控系统
 */

require('dotenv').config();
const MonitoringService = require('../services/monitoring/monitoring-service');

async function testMonitoringService() {
  const monitoringService = new MonitoringService();

  console.log('🧪 测试监控系统\n');

  try {
    // 测试1: 获取监控状态
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试1: 获取监控状态');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const status = await monitoringService.getMonitoringStatus();

    console.log('✅ 监控状态获取成功');
    console.log(`\n健康度:`);
    console.log(`  得分: ${status.health.score}`);
    console.log(`  等级: ${status.health.level}`);
    console.log(`  时间: ${status.timestamp}`);

    console.log('\n数据状态:');
    console.log(`  状态: ${status.data.status}`);
    console.log(`  市场数据: ${status.data.checks.marketData.status} - ${status.data.checks.marketData.message}`);
    console.log(`  资金流向: ${status.data.checks.fundFlow.status} - ${status.data.checks.fundFlow.message}`);
    console.log(`  新闻事件: ${status.data.checks.newsEvents.status} - ${status.data.checks.newsEvents.message}`);

    console.log('\n系统状态:');
    console.log(`  状态: ${status.system.status}`);
    console.log(`  内存: ${status.system.checks.memory.status} - ${status.system.checks.memory.message}`);
    console.log(`  运行时间: ${status.system.checks.uptime.status} - ${status.system.checks.uptime.message}`);

    console.log('\n业务状态:');
    console.log(`  状态: ${status.business.status}`);
    console.log(`  决策: ${status.business.checks.decisions.status} - ${status.business.checks.decisions.message}`);
    console.log(`  回测: ${status.business.checks.backtests.status} - ${status.business.checks.backtests.message}`);

    // 测试2: 创建测试告警
    console.log('\n' + '='.repeat(70));
    console.log('\n测试2: 创建测试告警');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const alert1 = monitoringService.createAlert('INFO', 'TEST', '这是一条INFO级别测试告警');
    console.log(`✅ INFO告警创建成功: ID=${alert1.id}`);

    const alert2 = monitoringService.createAlert('WARNING', 'TEST', '这是一条WARNING级别测试告警');
    console.log(`✅ WARNING告警创建成功: ID=${alert2.id}`);

    const alert3 = monitoringService.createAlert('ERROR', 'TEST', '这是一条ERROR级别测试告警', {
      errorCode: 'TEST_001',
      details: '测试错误详情'
    });
    console.log(`✅ ERROR告警创建成功: ID=${alert3.id}`);

    // 测试3: 获取告警历史
    console.log('\n' + '='.repeat(70));
    console.log('\n测试3: 获取告警历史');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const recentAlerts = monitoringService.getRecentAlerts(5);
    console.log(`✅ 告警历史获取成功: ${recentAlerts.length}条`);

    if (recentAlerts.length > 0) {
      console.log('\n最近的告警:');
      recentAlerts.forEach((alert, i) => {
        console.log(`  ${i + 1}. [${alert.level}] ${alert.type}: ${alert.message}`);
        console.log(`     时间: ${alert.timestamp}`);
      });
    }

    // 测试4: 生成监控报告
    console.log('\n' + '='.repeat(70));
    console.log('\n测试4: 生成监控报告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const report = await monitoringService.generateMonitoringReport('daily');

    console.log('✅ 监控报告生成成功');
    console.log(`\n报告摘要:`);
    console.log(`  周期: ${report.period}`);
    console.log(`  生成时间: ${report.generatedAt}`);
    console.log(`  健康得分: ${report.healthScore.score}`);
    console.log(`  健康等级: ${report.healthScore.level}`);

    if (report.recommendations.length > 0) {
      console.log(`\n改进建议:`);
      report.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.priority}] ${rec.type}: ${rec.message}`);
      });
    } else {
      console.log(`\n✨ 系统运行良好，无需改进建议`);
    }

    // 测试5: 验证数据状态检查
    console.log('\n' + '='.repeat(70));
    console.log('\n测试5: 验证各数据检查方法');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const marketDataCheck = await monitoringService.checkMarketDataFreshness();
    console.log(`✅ 市场数据检查: ${marketDataCheck.status}`);
    console.log(`   最新日期: ${marketDataCheck.latestDate || 'N/A'}`);
    console.log(`   延迟: ${marketDataCheck.hoursSinceUpdate !== null ? marketDataCheck.hoursSinceUpdate + '小时' : 'N/A'}`);

    const fundFlowCheck = await monitoringService.checkFundFlowFreshness();
    console.log(`✅ 资金流向检查: ${fundFlowCheck.status}`);
    console.log(`   最新日期: ${fundFlowCheck.latestDate || 'N/A'}`);
    console.log(`   延迟: ${fundFlowCheck.hoursSinceUpdate !== null ? fundFlowCheck.hoursSinceUpdate + '小时' : 'N/A'}`);

    const dbCheck = await monitoringService.checkDatabaseStatus();
    console.log(`✅ 数据库检查: ${dbCheck.status}`);
    console.log(`   连接数: ${dbCheck.connections || 'N/A'}`);
    console.log(`   大小: ${dbCheck.size || 'N/A'}`);

    const memCheck = monitoringService.checkMemoryUsage();
    console.log(`✅ 内存检查: ${memCheck.status}`);
    console.log(`   使用: ${memCheck.heapUsed} / ${memCheck.heapTotal} (${memCheck.usagePercent}%)`);

    const uptimeCheck = monitoringService.checkUptime();
    console.log(`✅ 运行时间检查: ${uptimeCheck.status}`);
    console.log(`   ${uptimeCheck.formatted}`);

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
testMonitoringService()
  .then(() => {
    console.log('\n✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
