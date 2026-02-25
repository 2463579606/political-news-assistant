/**
 * 创建回测系统数据表
 * Migration: 003_create_backtest_tables
 */

require('dotenv').config();
const { Pool } = require('pg');

async function createBacktestTables() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('📊 创建回测系统数据表...\n');

  try {
    // 1. 创建回测结果表
    console.log('1️⃣  创建回测结果表 (backtest_results)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backtest_results (
        id SERIAL PRIMARY KEY,
        stock_code VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        initial_capital DECIMAL(15,2) NOT NULL,
        final_capital DECIMAL(15,2) NOT NULL,
        total_return DECIMAL(10,4) NOT NULL,
        annual_return DECIMAL(10,4) NOT NULL,
        max_drawdown DECIMAL(10,4) NOT NULL,
        sharpe_ratio DECIMAL(10,4),
        sortino_ratio DECIMAL(10,4),
        calmar_ratio DECIMAL(10,4),
        win_rate DECIMAL(10,4),
        profit_loss_ratio DECIMAL(10,4),
        total_trades INTEGER NOT NULL,
        win_trades INTEGER NOT NULL,
        loss_trades INTEGER NOT NULL,
        avg_win DECIMAL(10,4),
        avg_loss DECIMAL(10,4),
        largest_win DECIMAL(10,4),
        largest_loss DECIMAL(10,4),
        avg_holding_period DECIMAL(10,2),
        parameters JSONB,
        metrics JSONB,
        equity_curve JSONB,
        daily_returns JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_stock_code
      ON backtest_results(stock_code)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_date_range
      ON backtest_results(start_date, end_date)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_created_at
      ON backtest_results(created_at DESC)
    `);

    console.log('✅ backtest_results 表创建成功');

    // 2. 创建交易记录表
    console.log('\n2️⃣  创建交易记录表 (backtest_trades)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backtest_trades (
        id SERIAL PRIMARY KEY,
        backtest_id INTEGER NOT NULL REFERENCES backtest_results(id) ON DELETE CASCADE,
        stock_code VARCHAR(20) NOT NULL,
        trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
        trade_date DATE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        commission DECIMAL(10,2) NOT NULL DEFAULT 0,
        slippage DECIMAL(10,2) NOT NULL DEFAULT 0,
        reason VARCHAR(50),
        decision_type VARCHAR(20),
        decision_id INTEGER,
        profit DECIMAL(15,2),
        profit_percent DECIMAL(10,4),
        holding_days INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_trades_backtest_id
      ON backtest_trades(backtest_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_trades_trade_date
      ON backtest_trades(trade_date)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_trades_stock_code
      ON backtest_trades(stock_code)
    `);

    console.log('✅ backtest_trades 表创建成功');

    // 3. 创建参数优化结果表
    console.log('\n3️⃣  创建参数优化结果表 (backtest_optimizations)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backtest_optimizations (
        id SERIAL PRIMARY KEY,
        stock_code VARCHAR(20) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        optimization_method VARCHAR(50) NOT NULL, -- grid_search, genetic, bayesian
        parameter_space JSONB NOT NULL,
        best_parameters JSONB NOT NULL,
        best_score DECIMAL(10,4) NOT NULL,
        target_metric VARCHAR(50) NOT NULL, -- sharpe_ratio, total_return, etc.
        all_results JSONB,
        iterations INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_optimizations_stock_code
      ON backtest_optimizations(stock_code)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_optimizations_created_at
      ON backtest_optimizations(created_at DESC)
    `);

    console.log('✅ backtest_optimizations 表创建成功');

    // 4. 创建回测汇总表（用于多策略对比）
    console.log('\n4️⃣  创建回测汇总表 (backtest_summary)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backtest_summary (
        id SERIAL PRIMARY KEY,
        stock_code VARCHAR(20) NOT NULL,
        strategy_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_return DECIMAL(10,4) NOT NULL,
        annual_return DECIMAL(10,4) NOT NULL,
        max_drawdown DECIMAL(10,4) NOT NULL,
        sharpe_ratio DECIMAL(10,4),
        win_rate DECIMAL(10,4),
        total_trades INTEGER,
        tags VARCHAR(100)[],
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stock_code, strategy_name, start_date, end_date)
      )
    `);

    console.log('✅ backtest_summary 表创建成功');

    // 验证表创建
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  验证表创建');

    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('backtest_results', 'backtest_trades', 'backtest_optimizations', 'backtest_summary')
      ORDER BY table_name
    `);

    console.log('\n已创建的表:');
    tables.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 回测系统数据表创建完成!');
    console.log('\n💡 下一步: 实现回测引擎核心功能');

  } catch (error) {
    console.error('\n❌ 创建表失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行迁移
createBacktestTables()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
