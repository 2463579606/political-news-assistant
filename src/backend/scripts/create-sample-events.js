/**
 * 创建示例新闻事件数据
 * 用于测试向量检索功能
 */

require('dotenv').config();
const EventExtractor = require('../services/news-analysis/event-extractor');
const { Pool } = require('pg');

async function createSampleEvents() {
  const eventExtractor = new EventExtractor();
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('📝 创建示例新闻事件数据...\n');

  // 示例新闻数据
  const sampleNews = [
    {
      id: 1001,
      title: '央行宣布下调存款准备金率0.5个百分点',
      content: '中国人民银行今日宣布，决定于近期下调存款准备金率0.5个百分点，释放长期资金约1万亿元。此举旨在加大对实体经济的支持力度，巩固经济回升向好态势。',
      source: '新华社',
      publishTime: '2026-02-20'
    },
    {
      id: 1002,
      title: '降息刺激经济增长',
      content: '央行下调利率0.25个百分点，加大对实体经济的支持力度。银行、券商和房地产板块有望受益。',
      source: '央视财经',
      publishTime: '2026-02-19'
    },
    {
      id: 1003,
      title: '房地产市场调控收紧',
      content: '多地出台房地产调控新政策，收紧房贷条件，抑制投机性需求。',
      source: '证券时报',
      publishTime: '2026-02-18'
    },
    {
      id: 1004,
      title: '芯片行业迎来政策支持',
      content: '国家出台多项政策支持半导体产业发展，包括税收优惠和资金支持。',
      source: '科技日报',
      publishTime: '2026-02-17'
    },
    {
      id: 1005,
      title: '新能源汽车销量大增',
      content: '2025年新能源汽车产销同比分别增长30%和35%，市场渗透率达到35%。',
      source: '汽车之家',
      publishTime: '2026-02-16'
    },
    {
      id: 1006,
      title: '煤炭价格大幅上涨',
      content: '受供应紧张影响，煤炭价格近期大幅上涨，火电企业成本压力增加。',
      source: '能源周刊',
      publishTime: '2026-02-15'
    },
    {
      id: 1007,
      title: '医药行业集采扩面',
      content: '国家组织药品集中带量采购范围进一步扩大，药品价格平均降幅超过50%。',
      source: '健康报',
      publishTime: '2026-02-14'
    },
    {
      id: 1008,
      title: '券商板块业绩大幅增长',
      content: '受益于市场交投活跃，多家券商公布业绩预告，净利润同比增长超过100%。',
      source: '上海证券报',
      publishTime: '2026-02-13'
    },
    {
      id: 1009,
      title: '光伏产业产能扩张',
      content: '多家光伏企业宣布扩产计划，预计新增产能将满足未来三年需求增长。',
      source: '新能源报',
      publishTime: '2026-02-12'
    },
    {
      id: 1010,
      title: '食品饮料行业稳健增长',
      content: '食品饮料行业上市公司业绩稳健增长，白酒、乳制品等细分领域表现突出。',
      source: '消费日报',
      publishTime: '2026-02-11'
    }
  ];

  try {
    // 清理旧数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  清理旧数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await pool.query('DELETE FROM news_events WHERE news_id = ANY($1)', [
      sampleNews.map(n => n.id)
    ]);
    console.log('✅ 清理完成');

    // 提取并保存事件
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  提取并保存事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const createdEvents = [];

    for (const news of sampleNews) {
      console.log(`\n处理: ${news.title}`);

      try {
        const event = await eventExtractor.extract(news);
        const eventId = await eventExtractor.saveToDatabase(event);

        createdEvents.push({
          newsId: news.id,
          eventId: eventId,
          title: event.title,
          eventType: event.eventType,
          sentiment: event.sentiment
        });

        console.log(`  ✅ 事件已保存 (ID: ${eventId})`);

      } catch (error) {
        console.error(`  ❌ 失败: ${error.message}`);
      }
    }

    // 统计结果
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  创建结果统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n总数: ${sampleNews.length}`);
    console.log(`成功: ${createdEvents.length} ✅`);
    console.log(`失败: ${sampleNews.length - createdEvents.length} ❌`);

    // 事件类型分布
    console.log('\n事件类型分布:');
    const eventTypeCount = {};
    createdEvents.forEach(e => {
      eventTypeCount[e.eventType] = (eventTypeCount[e.eventType] || 0) + 1;
    });
    Object.entries(eventTypeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}条`);
    });

    // 情感分布
    console.log('\n情感倾向分布:');
    const sentimentCount = {};
    createdEvents.forEach(e => {
      sentimentCount[e.sentiment] = (sentimentCount[e.sentiment] || 0) + 1;
    });
    Object.entries(sentimentCount).forEach(([sentiment, count]) => {
      const percentage = ((count / createdEvents.length) * 100).toFixed(1);
      console.log(`  ${sentiment}: ${count}条 (${percentage}%)`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 示例事件创建完成!');
    console.log(`\n💡 已创建${createdEvents.length}个示例新闻事件`);
    console.log('💡 下一步: 运行 node scripts/index-historical-events.js 索引这些事件\n');

  } catch (error) {
    console.error('\n❌ 创建失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行脚本
createSampleEvents()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
