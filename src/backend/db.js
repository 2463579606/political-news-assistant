const { Pool } = require('pg');

let pool = null;

const SQL_SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url TEXT,
  source_name VARCHAR(255),
  published_at TIMESTAMP,
  importance_score DECIMAL(3, 2),
  category VARCHAR(50),
  category_slug VARCHAR(50),
  keywords TEXT[],
  url_to_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  news_id VARCHAR(50) REFERENCES news_articles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, news_id)
);

-- Reading history table
CREATE TABLE IF NOT EXISTS reading_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  news_id VARCHAR(50) REFERENCES news_articles(id),
  duration INTEGER DEFAULT 0,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_importance ON news_articles(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_user ON reading_history(user_id, read_at DESC);
`;

function getPool() {
  return pool;
}

async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://political_news_user:political_news_pass@localhost:5432/political_news';
  
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    
    // Create tables
    await client.query(SQL_SCHEMA);
    console.log('Database schema initialized');
    
    await client.release();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  getPool,
  initializeDatabase,
  closeDatabase,
  SQL_SCHEMA
};
