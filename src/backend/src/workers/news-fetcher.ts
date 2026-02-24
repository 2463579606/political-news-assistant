// ============================================
// News Fetcher Worker - 定时抓取新闻
// ============================================

import { newsService } from '../services/NewsService';
import { db } from '../db/connection';
import { sql } from 'drizzle-orm';

interface FetchJob {
  category?: string;
  country: string;
  language?: string;
}

const JOBS: FetchJob[] = [
  // 中国 - 时政
  { country: 'cn', category: 'general' },
  { country: 'cn', category: 'business' },
  { country: 'cn', category: 'technology' },

  // 美国 - 时政
  { country: 'us', category: 'general' },
  { country: 'us', category: 'business' },
  { country: 'us', category: 'technology' },

  // 英国
  { country: 'gb', category: 'general' },
  { country: 'gb', category: 'business' },

  // 日本
  { country: 'jp', category: 'general' },
  { country: 'jp', category: 'business' },
];

/**
 * 执行一次新闻抓取
 */
export async function fetchNewsOnce() {
  console.log('🔄 Starting news fetch...');
  const startTime = Date.now();

  let totalFetched = 0;
  let totalSaved = 0;

  for (const job of JOBS) {
    console.log(`\n📡 Fetching: ${job.country.toUpperCase()} - ${job.category || 'all'}`);

    try {
      const saved = await newsService.fetchAndSave({
        ...job,
        pageSize: 50,
      });

      totalFetched += 50;
      totalSaved += saved;

      console.log(`  ✓ Saved ${saved} articles`);

      // 避免API限流
      await sleep(1000);
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Fetch completed in ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`   Total: ${totalSaved}/${totalFetched} articles saved`);
}

/**
 * 清理旧新闻（保留30天）
 */
export async function cleanupOldNews() {
  console.log('🧹 Cleaning up old news...');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const result = await db.execute(sql`
      DELETE FROM news
      WHERE created_at < ${thirtyDaysAgo}
        AND id NOT IN (
          SELECT DISTINCT news_id FROM bookmarks
          WHERE news_id IS NOT NULL
        )
        AND id NOT IN (
          SELECT DISTINCT news_id FROM reading_history
          WHERE news_id IS NOT NULL
        )
    `);

    const deleted = result.rowCount || 0;
    console.log(`  ✓ Deleted ${deleted} old articles`);
  } catch (error) {
    console.error('  ✗ Cleanup failed:', error);
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
    try {
      await fetchNewsOnce();
      await cleanupOldNews();
      console.log('\n✨ Done!');
      process.exit(0);
    } catch (error) {
      console.error('Worker failed:', error);
      process.exit(1);
    }
  })();
}
