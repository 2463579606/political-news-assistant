const { getPool } = require('./db');

async function addBookmark(userId, newsId) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory
    console.warn('Database not available, using in-memory storage');
    const bookmarks = global.bookmarks || [];
    const existing = bookmarks.find(b => b.userId === userId && b.newsId === newsId);
    if (existing) return { success: false, error: 'Already bookmarked' };

    const bookmark = {
      id: bookmarks.length + 1,
      userId,
      newsId,
      createdAt: new Date()
    };
    bookmarks.push(bookmark);
    global.bookmarks = bookmarks;
    return { success: true, bookmark };
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO bookmarks (user_id, news_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, news_id) DO NOTHING
       RETURNING id, user_id, news_id, created_at`,
      [userId, newsId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Already bookmarked' };
    }

    return { success: true, bookmark: result.rows[0] };
  } catch (error) {
    console.error('Database error in addBookmark:', error);
    return { success: false, error: 'Failed to add bookmark' };
  } finally {
    client.release();
  }
}

async function removeBookmark(userId, newsId) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory
    console.warn('Database not available, using in-memory storage');
    const bookmarks = global.bookmarks || [];
    const index = bookmarks.findIndex(b => b.userId === userId && b.newsId === newsId);
    if (index === -1) return { success: false, error: 'Bookmark not found' };

    bookmarks.splice(index, 1);
    global.bookmarks = bookmarks;
    return { success: true };
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND news_id = $2 RETURNING id',
      [userId, newsId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Bookmark not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('Database error in removeBookmark:', error);
    return { success: false, error: 'Failed to remove bookmark' };
  } finally {
    client.release();
  }
}

async function getUserBookmarks(userId) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory
    console.warn('Database not available, using in-memory storage');
    const bookmarks = global.bookmarks || [];
    return bookmarks.filter(b => b.userId === userId);
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT b.id, b.news_id, b.created_at,
              n.title, n.description, n.url, n.category, n.source_name, n.published_at
       FROM bookmarks b
       LEFT JOIN news_articles n ON b.news_id = n.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id.toString(),
      newsId: row.news_id,
      createdAt: row.created_at,
      article: row.title ? {
        id: row.news_id,
        title: row.title,
        description: row.description,
        url: row.url,
        category: row.category,
        sourceName: row.source_name,
        publishedAt: row.published_at
      } : null
    }));
  } catch (error) {
    console.error('Database error in getUserBookmarks:', error);
    return [];
  } finally {
    client.release();
  }
}

async function isBookmarked(userId, newsId) {
  const pool = getPool();
  if (!pool) {
    const bookmarks = global.bookmarks || [];
    return bookmarks.some(b => b.userId === userId && b.newsId === newsId);
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM bookmarks WHERE user_id = $1 AND news_id = $2',
      [userId, newsId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database error in isBookmarked:', error);
    return false;
  } finally {
    client.release();
  }
}

module.exports = {
  addBookmark,
  removeBookmark,
  getUserBookmarks,
  isBookmarked
};
