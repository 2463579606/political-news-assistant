const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    iat: Date.now()
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function register(email, password) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory if database not available
    console.warn('Database not available, using in-memory storage');
    const { register: registerMemory } = require('./auth-service');
    return registerMemory(email, password);
  }

  const client = await pool.connect();
  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return { success: false, error: 'User already exists' };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);

    const result = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];

    return {
      success: true,
      user: { id: user.id.toString(), email: user.email }
    };
  } catch (error) {
    console.error('Database error in register:', error);
    return { success: false, error: 'Registration failed' };
  } finally {
    client.release();
  }
}

async function login(email, password) {
  const pool = getPool();
  if (!pool) {
    // Fallback to in-memory if database not available
    console.warn('Database not available, using in-memory storage');
    const { login: loginMemory } = require('./auth-service');
    return loginMemory(email, password);
  }

  const client = await pool.connect();
  try {
    // Find user by email
    const result = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Invalid credentials' };
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate token
    const token = generateToken(user);

    return {
      success: true,
      token,
      user: { id: user.id.toString(), email: user.email }
    };
  } catch (error) {
    console.error('Database error in login:', error);
    return { success: false, error: 'Login failed' };
  } finally {
    client.release();
  }
}

function authenticateToken(token) {
  const decoded = verifyToken(token);
  return decoded ? { userId: decoded.userId, email: decoded.email } : null;
}

async function getUserById(userId) {
  const pool = getPool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    return {
      id: user.id.toString(),
      email: user.email,
      createdAt: user.created_at
    };
  } catch (error) {
    console.error('Database error in getUserById:', error);
    return null;
  } finally {
    client.release();
  }
}

module.exports = {
  register,
  login,
  authenticateToken,
  getUserById,
  hashPassword,
  verifyPassword
};
