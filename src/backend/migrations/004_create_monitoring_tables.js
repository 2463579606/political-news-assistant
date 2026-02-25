/**
 * 创建监控告警数据表
 * Migration: 004_create_monitoring_tables
 */

require('dotenv').config();
const { Pool } = require('pg');

async function createMonitoringTables() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('📊 创建监控告警数据表...\n');

  try {
    // 1. 创建告警记录表
    console.log('1️⃣  创建告警记录表 (monitoring_alerts)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_alerts (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_level
      ON monitoring_alerts(level)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at
      ON monitoring_alerts(created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved
      ON monitoring_alerts(resolved, created_at DESC)
    `);

    console.log('✅ monitoring_alerts 表创建成功');

    // 2. 创建监控指标表（用于历史监控数据）
    console.log('\n2️⃣  创建监控指标表 (monitoring_metrics)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(15,4) NOT NULL,
        metric_unit VARCHAR(50),
        tags JSONB,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name
      ON monitoring_metrics(metric_name)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_recorded_at
      ON monitoring_metrics(recorded_at DESC)
    `);

    // 创建复合索引（用于时序查询）
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name_time
      ON monitoring_metrics(metric_name, recorded_at DESC)
    `);

    console.log('✅ monitoring_metrics 表创建成功');

    // 3. 创建系统性能表
    console.log('\n3️⃣  创建系统性能表 (monitoring_performance)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_performance (
        id SERIAL PRIMARY KEY,
        api_endpoint VARCHAR(200),
        response_time_ms INTEGER,
        status_code INTEGER,
        error_message TEXT,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_perf_endpoint
      ON monitoring_performance(api_endpoint)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_perf_recorded_at
      ON monitoring_performance(recorded_at DESC)
    `);

    console.log('✅ monitoring_performance 表创建成功');

    // 4. 创建数据更新日志表
    console.log('\n4️⃣  创建数据更新日志表 (monitoring_data_updates)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_data_updates (
        id SERIAL PRIMARY KEY,
        data_type VARCHAR(50) NOT NULL,
        update_status VARCHAR(20) NOT NULL CHECK (update_status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        error_message TEXT,
        duration_ms INTEGER,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_updates_type
      ON monitoring_data_updates(data_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_updates_status
      ON monitoring_data_updates(update_status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_monitoring_updates_created_at
      ON monitoring_data_updates(created_at DESC)
    `);

    console.log('✅ monitoring_data_updates 表创建成功');

    // 验证表创建
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  验证表创建');

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('monitoring_alerts', 'monitoring_metrics', 'monitoring_performance', 'monitoring_data_updates')
      ORDER BY table_name
    `);

    console.log('\n已创建的表:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 监控告警数据表创建完成!');
    console.log('\n💡 下一步: 实现监控API接口');

  } catch (error) {
    console.error('\n❌ 创建表失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行迁移
createMonitoringTables()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
