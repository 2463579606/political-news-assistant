const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

const JWT_SECRET = 'your-secret-key-change-this-in-production';
const JWT_EXPIRY = '7d';

const users = [];

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
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return { success: false, error: 'User already exists' };
  }

  const passwordHash = await hashPassword(password);

  const user = {
    id: uuid.v4(),
    email,
    passwordHash,
    createdAt: new Date()
  };

  users.push(user);

  return {
    success: true,
    user: { id: user.id, email: user.email }
  };
}

async function login(email, password) {
  const user = users.find(u => u.email === email);
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid credentials' };
  }

  const token = generateToken(user);

  return {
    success: true,
    token,
    user: { id: user.id, email: user.email }
  };
}

function authenticateToken(token) {
  const decoded = verifyToken(token);
  return decoded ? { userId: decoded.userId, email: decoded.email } : null;
}

module.exports = {
  register,
  login,
  authenticateToken,
  hashPassword,
  verifyPassword
};
