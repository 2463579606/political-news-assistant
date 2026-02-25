/**
 * 新闻事件提取测试脚本
 * 测试事件提取、情感分析和板块映射功能
 */

require('dotenv').config();
const EventExtractor = require('../services/news-analysis/event-extractor');
const SentimentAnalyzer = require('../services/news-analysis/sentiment-analyzer');
const SectorMapper = require('../services/news-analysis/sector-mapper');

async function testNewsEventExtraction() {
  const eventExtractor = new EventExtractor();
  const sentimentAnalyzer = new SentimentAnalyzer();
  const sectorMapper = new SectorMapper();

  console.log('🧪 开始测试新闻事件提取...\n');

  // 测试新闻数据
  const testNews = [
    {
      id: 1,
      title: '央行宣布下调存款准备金率0.5个百分点',
      content: '中国人民银行今日宣布，决定于近期下调存款准备金率0.5个百分点，释放长期资金约1万亿元。此举旨在加大对实体经济的支持力度，巩固经济回升向好态势。',
      source: '新华社',
      publishTime: '2026-02-25'
    },
    {
      id: 2,
      title: 'GDP增长5.2%，经济稳中向好',
      content: '国家统计局今日发布数据显示，2025年国内生产总值比上年增长5.2%，国民经济运行总体平稳，稳中向好态势进一步巩固。',
      source: '央视新闻',
      publishTime: '2026-02-25'
    },
    {
      id: 3,
      title: '新能源汽车产销量双增长',
      content: '据中国汽车工业协会数据，2025年新能源汽车产销同比分别增长30%和35%，市场渗透率达到35%。',
      source: '证券时报',
      publishTime: '2026-02-25'
    }
  ];

  try {
    // 1. 测试事件提取
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  测试事件提取');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const news of testNews) {
      console.log(`\n新闻: ${news.title}`);

      const event = await eventExtractor.extract(news);

      console.log(`  事件类型: ${event.eventType}`);
      console.log(`  重要性评分: ${event.importanceScore}/10`);
      console.log(`  情感倾向: ${event.sentiment} (${event.sentimentScore})`);
      console.log(`  影响板块: ${event.impactSectors.join(', ')}`);
      console.log(`  影响股票: ${event.impactStocks.length > 0 ? event.impactStocks.join(', ') : '无'}`);
      console.log(`  置信度: ${(event.confidence * 100).toFixed(0)}%`);

      if (event.isMock) {
        console.log(`  ⚠️  [模拟提取]`);
      }
    }

    // 2. 测试情感分析
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  测试情感分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testTexts = [
      '央行降准释放万亿资金，利好银行和券商板块',
      '经济下行压力加大，市场担忧情绪蔓延',
      'GDP数据符合预期，市场反应平稳'
    ];

    for (const text of testTexts) {
      console.log(`\n文本: "${text}"`);

      const sentiment = await sentimentAnalyzer.analyze(text);

      console.log(`  情感: ${sentiment.label}`);
      console.log(`  分数: ${sentiment.score}`);
      console.log(`  置信度: ${(sentiment.confidence * 100).toFixed(0)}%`);
      console.log(`  方法: ${sentiment.method}`);
    }

    // 3. 测试板块映射
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  测试板块映射');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testEvents = [
      { title: '芯片行业迎来政策支持', description: '国家出台多项政策支持半导体产业发展' },
      { title: '房地产市场调控收紧', description: '多地出台房地产调控新政策' },
      { title: '新能源汽车销量大增', description: '2025年新能源汽车销量创新高' }
    ];

    for (const event of testEvents) {
      console.log(`\n事件: ${event.title}`);

      const sectors = await sectorMapper.mapEventToSectors(event);

      console.log(`  相关板块: ${sectors.join(', ')}`);
      console.log(`  板块数量: ${sectors.length}`);
    }

    // 4. 测试股票推荐
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  测试股票推荐');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testEvent = {
      title: '央行降准0.5个百分点',
      description: '释放长期资金约1万亿元，利好银行板块'
    };

    console.log(`\n事件: ${testEvent.title}`);

    const recommendation = await sectorMapper.recommendStocks(testEvent, 10);

    console.log(`  推荐板块: ${recommendation.sectors.join(', ')}`);
    console.log(`  推荐股票:`);
    recommendation.stocks.forEach((stock, index) => {
      console.log(`    ${index + 1}. ${stock.code} (${stock.sector}) - 相关性: ${stock.relevanceScore}`);
    });
    console.log(`  置信度: ${(recommendation.confidence * 100).toFixed(0)}%`);

    // 5. 测试板块热度分析
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  测试板块热度分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const mockEvents = [
      { impactSectors: ['银行', '券商'], importanceScore: 9 },
      { impactSectors: ['半导体'], importanceScore: 8 },
      { impactSectors: ['新能源车'], importanceScore: 7 },
      { impactSectors: ['银行', '房地产'], importanceScore: 6 },
      { impactSectors: ['医药'], importanceScore: 5 }
    ];

    const sectorHeat = sectorMapper.analyzeSectorHeat(mockEvents);

    console.log('\n板块热度排序:');
    sectorHeat.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.sector}: ${item.score}分`);
    });

    // 6. 清理测试数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣  清理测试数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const pool = eventExtractor.pool;

    // 清理测试事件
    await pool.query('DELETE FROM news_events WHERE news_id IN (1, 2, 3)');
    console.log('✅ 清理测试事件完成');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 新闻事件提取测试完成!');
    console.log('\n💡 注意事项:');
    console.log('   - Claude API需要ANTHROPIC_API_KEY环境变量');
    console.log('   - 未设置API时使用模拟提取');
    console.log('   - 情感分析基于词典（Phase 3将集成FinBERT）');
    console.log('   - 板块映射基于关键词匹配');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

// 运行测试
testNewsEventExtraction()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
