// ============================================
// Daily Brief Worker - 生成每日简报
// ============================================

import { aiService } from '../services/AIService';
import { cache } from '../lib/cache';

/**
 * 生成并缓存每日简报
 */
export async function generateDailyBrief(date: Date = new Date()) {
  console.log(`📰 Generating daily brief for ${date.toISOString().split('T')[0]}...`);

  try {
    const brief = await aiService.generateDailyBrief(date);
    console.log('✅ Daily brief generated');
    console.log('\n' + brief);
  } catch (error) {
    console.error('❌ Failed to generate daily brief:', error);
    throw error;
  }
}

/**
 * 预生成重要新闻的摘要
 */
export async function generateNewsSummaries() {
  console.log('📝 Generating news summaries...');

  const { db, news } = require('../db/connection');
  const { eq, and, sql, isNull } = require('drizzle-orm');

  try {
    // 获取没有摘要的新闻（最近24小时）
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const items = await db
      .select()
      .from(news)
      .where(
        and(
          sql`${news.publishedAt} >= ${oneDayAgo}`,
          isNull(news.summaryAi)
        )
      )
      .limit(50);

    console.log(`  Found ${items.length} articles without summaries`);

    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        await aiService.generateSummary(item.id);
        successCount++;

        // 避免API限流
        await sleep(500);
      } catch (error) {
        failCount++;
        console.error(`  ✗ Failed to summarize ${item.id}:`, error);
      }
    }

    console.log(`  ✓ Generated ${successCount} summaries`);
    if (failCount > 0) {
      console.log(`  ✗ Failed ${failCount} summaries`);
    }
  } catch (error) {
    console.error('❌ Failed to generate summaries:', error);
    throw error;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 如果直接运行此脚本
if (require.main === module) {
  const { dotenv } = require('dotenv');
  dotenv.config();

  (async () => {
    const command = process.argv[2];

    try {
      if (command === 'brief') {
        await generateDailyBrief();
      } else if (command === 'summaries') {
        await generateNewsSummaries();
      } else {
        // 默认运行两个任务
        await generateNewsSummaries();
        console.log('\n' + '='.repeat(50) + '\n');
        await generateDailyBrief();
      }

      console.log('\n✨ Done!');
      process.exit(0);
    } catch (error) {
      console.error('Worker failed:', error);
      process.exit(1);
    }
  })();
}
