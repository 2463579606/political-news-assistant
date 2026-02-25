/**
 * 数据库迁移脚本
 * 执行SQL文件创建表结构
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'political_news',
  user: process.env.POSTGRES_USER || 'political_news_user',
  password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 开始数据库迁移...\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'migrations', '001_create_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 改进的SQL语句分割逻辑
    // 按分号分割，但保留完整的CREATE TABLE语句（包含constraints）
    const statements = [];
    let currentStatement = '';
    let inCreateTable = false;

    const lines = sql.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();

      // 跳过注释和空行
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }

      currentStatement += line + '\n';

      // 检测CREATE TABLE开始
      if (trimmedLine.toUpperCase().startsWith('CREATE TABLE')) {
        inCreateTable = true;
      }

      // 检测语句结束
      if (trimmedLine.endsWith(';')) {
        if (inCreateTable && trimmedLine === ');') {
          // CREATE TABLE结束
          inCreateTable = false;
        } else if (!inCreateTable) {
          // 普通语句结束
        }

        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    let successCount = 0;
    let errorCount = 0;

    // 执行每个SQL语句
    for (const statement of statements) {
      try {
        await client.query(statement);
        successCount++;

        // 显示创建的表
        if (statement.toLowerCase().includes('create table')) {
          const match = statement.match(/create\s+table\s+if\s+not\s+exists\s+(\w+)/i);
          if (match) {
            console.log(`✅ 创建表: ${match[1]}`);
          }
        }
      } catch (err) {
        // 忽略"已存在"错误
        if (!err.message.includes('already exists')) {
          console.error(`❌ 执行失败: ${err.message}`);
          console.error(`SQL: ${statement.substring(0, 100)}...`);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    console.log(`\n✨ 迁移完成!`);
    console.log(`   成功: ${successCount} 条`);
    console.log(`   失败: ${errorCount} 条`);

    // 显示所有表
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log(`\n📊 数据库表列表:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

  } catch (err) {
    console.error('❌ 迁移失败:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('\n✅ 数据库迁移成功完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 数据库迁移失败:', err);
    process.exit(1);
  });
