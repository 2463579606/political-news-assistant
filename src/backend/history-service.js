const { getPool } = require('./db');

async function addReadingHistory(userId, newsId, duration = 0) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory
    console.warn('Database not available, using in-memory storage');
    const history = global.history || [];
    const record = {
      id: history.length + 1,
      userId,
      newsId,
      duration,
      readAt: new Date()
    };
    history.push(record);
    global.history = history;
    return { success: true, record };
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO reading_history (user_id, news_id, duration, read_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, user_id, news_id, duration, read_at`,
      [userId, newsId, duration]
    );

    return { success: true, record: result.rows[0] };
  } catch (error) {
    console.error('Database error in addReadingHistory:', error);
    return { success: false, error: 'Failed to add reading history' };
  } finally {
    client.release();
  }
}

async function getUserReadingHistory(userId, limit = 50) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory
    console.warn('Database not available, using in-memory storage');
    const history = global.history || [];
    return history.filter(h => h.userId === userId).slice(0, limit);
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT h.id, h.news_id, h.duration, h.read_at,
              n.title, n.description, n.url, n.category, n.source_name
       FROM reading_history h
       LEFT JOIN news_articles n ON h.news_id = n.id
       WHERE h.user_id = $1
       ORDER BY h.read_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id.toString(),
      newsId: row.news_id,
      duration: row.duration,
      readAt: row.read_at,
      article: row.title ? {
        id: row.news_id,
        title: row.title,
        description: row.description,
        url: row.url,
        category: row.category,
        sourceName: row.source_name
      } : null
    }));
  } catch (error) {
    console.error('Database error in getUserReadingHistory:', error);
    return [];
  } finally {
    client.release();
  }
}

async function getReadingStats(userId) {
  const pool = getPool();
  if (!pool) {
    return {
      totalRead: 0,
      totalDuration: 0,
      topCategories: []
    };
  }

  const client = await pool.connect();
  try {
    // Total articles read
    const totalResult = await client.query(
      'SELECT COUNT(DISTINCT news_id) as total FROM reading_history WHERE user_id = $1',
      [userId]
    );

    // Total reading duration
    const durationResult = await client.query(
      'SELECT COALESCE(SUM(duration), 0) as total FROM reading_history WHERE user_id = $1',
      [userId]
    );

    // Top categories
    const categoriesResult = await client.query(
      `SELECT n.category, COUNT(*) as count
       FROM reading_history h
       LEFT JOIN news_articles n ON h.news_id = n.id
       WHERE h.user_id = $1 AND n.category IS NOT NULL
       GROUP BY n.category
       ORDER BY count DESC
       LIMIT 5`,
      [userId]
    );

    return {
      totalRead: parseInt(totalResult.rows[0].total),
      totalDuration: parseInt(durationResult.rows[0].total),
      topCategories: categoriesResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      }))
    };
  } catch (error) {
    console.error('Database error in getReadingStats:', error);
    return {
      totalRead: 0,
      totalDuration: 0,
      topCategories: []
    };
  } finally {
    client.release();
  }
}

module.exports = {
  addReadingHistory,
  getUserReadingHistory,
  getReadingStats
};
