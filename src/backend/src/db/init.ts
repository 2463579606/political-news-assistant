// ============================================
// Database Initialization Script
// ============================================

import { db, categories, users } from './connection';
import { eq } from 'drizzle-orm';

/**
 * 初始化分类数据
 */
export async function initCategories() {
  console.log('Initializing categories...');

  const categoriesData = [
    { name: '时政', slug: 'politics', icon: 'Landmark', color: '#ef4444' },
    { name: '财经', slug: 'business', icon: 'TrendingUp', color: '#22c55e' },
    { name: '科技', slug: 'technology', icon: 'Cpu', color: '#3b82f6' },
    { name: '国际', slug: 'world', icon: 'Globe', color: '#8b5cf6' },
    { name: '其他', slug: 'general', icon: 'Newspaper', color: '#6b7280' },
  ];

  for (const cat of categoriesData) {
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, cat.slug))
      .limit(1);

    if (!existing) {
      await db.insert(categories).values({
        ...cat,
        isActive: true,
      });
      console.log(`  ✓ Created category: ${cat.name}`);
    }
  }

  console.log('Categories initialized successfully');
}

/**
 * 创建演示用户
 */
export async function createDemoUser() {
  console.log('Creating demo user...');

  const email = 'demo@example.com';
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    await db.insert(users).values({
      email,
      name: 'Demo User',
      preferences: {
        filter_keywords: [],
        filter_sources: [],
        filter_categories: ['entertainment', 'sports'],
        notification_enabled: true,
        daily_digest: true,
        digest_time: '08:00',
      },
    });
    console.log(`  ✓ Created demo user: ${email}`);
  } else {
    console.log(`  ✓ Demo user already exists: ${email}`);
  }
}

/**
 * 主初始化函数
 */
export async function initializeDatabase() {
  console.log('🔧 Initializing database...\n');

  try {
    await initCategories();
    await createDemoUser();

    console.log('\n✅ Database initialized successfully');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 加载环境变量
  require('dotenv').config();

  initializeDatabase()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
