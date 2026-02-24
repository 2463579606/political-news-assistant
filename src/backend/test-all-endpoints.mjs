#!/usr/bin/env node

/**
 * Comprehensive E2E Test Script
 * Tests all backend endpoints and their functionality
 */

const API_BASE = 'http://localhost:3001';

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let testUserId = null;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function assert(condition, testName, errorMessage) {
  if (condition) {
    testsPassed++;
    log(`✓ PASS: ${testName}`);
    return true;
  } else {
    testsFailed++;
    log(`✗ FAIL: ${testName} - ${errorMessage}`);
    return false;
  }
}

async function testGet(endpoint, testName, validator) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();
    const isValid = validator(data, response);
    return assert(isValid, testName, 'Validation failed');
  } catch (error) {
    return assert(false, testName, error.message);
  }
}

async function testPost(endpoint, body, testName, validator) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    const isValid = validator(data, response);
    return isValid ? data : null;
  } catch (error) {
    assert(false, testName, error.message);
    return null;
  }
}

async function runTests() {
  log('=== Starting Comprehensive E2E Tests ===\n');

  // Test 1: Health Check
  log('Test 1: Health Check');
  await testGet('/api/v1/health', 'Health endpoint', (data, res) => {
    return res.ok && data.status === 'ok' && data.name === 'Political News Assistant API';
  });

  // Test 2: Get All News
  log('\nTest 2: Get All News');
  await testGet('/api/v1/news', 'Get all news', (data, res) => {
    return res.ok && Array.isArray(data.data) && data.data.length > 0;
  });

  // Test 3: Search News (English)
  log('\nTest 3: Search News (English)');
  await testGet('/api/v1/news/search?q=AI', 'Search for AI news', (data, res) => {
    return res.ok && Array.isArray(data.data) && data.data.length > 0;
  });

  // Test 4: Search News (Chinese - URL encoded)
  log('\nTest 4: Search News (Chinese)');
  await testGet('/api/v1/news/search?q=%E7%A7%91%E6%8A%80', 'Search for 科技', (data, res) => {
    return res.ok && Array.isArray(data.data) && data.data.length > 0;
  });

  // Test 5: Category Filter
  log('\nTest 5: Category Filter');
  await testGet('/api/v1/news?category=business', 'Filter by business category', (data, res) => {
    return res.ok && Array.isArray(data.data);
  });

  // Test 6: News Detail
  log('\nTest 6: News Detail');
  await testGet('/api/v1/news/1', 'Get news detail', (data, res) => {
    return res.ok && data.id === '1' && data.title;
  });

  // Test 7: User Registration
  log('\nTest 7: User Registration');
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  const regData = await testPost('/api/v1/auth/register',
    { email: testEmail, password: 'testpass123' },
    'Register new user',
    (data, res) => {
      return res.status === 201 && data.success && data.user && data.user.email === testEmail;
    }
  );

  if (regData && regData.user) {
    testUserId = regData.user.id;
  }

  // Test 8: Duplicate Registration (should fail)
  log('\nTest 8: Duplicate Registration (should fail)');
  await testPost('/api/v1/auth/register',
    { email: testEmail, password: 'testpass123' },
    'Register duplicate user',
    (data, res) => {
      return !data.success && data.error === 'User already exists';
    }
  );

  // Test 9: User Login
  log('\nTest 9: User Login');
  const loginData = await testPost('/api/v1/auth/login',
    { email: testEmail, password: 'testpass123' },
    'Login user',
    (data, res) => {
      return res.ok && data.success && data.token && data.user;
    }
  );

  if (loginData && loginData.token) {
    authToken = loginData.token;
    log(`  Token: ${loginData.token.substring(0, 50)}...`);
  }

  // Test 10: Login with Wrong Password (should fail)
  log('\nTest 10: Login with Wrong Password (should fail)');
  await testPost('/api/v1/auth/login',
    { email: testEmail, password: 'wrongpass' },
  'Login with wrong password',
    (data, res) => {
      return !data.success && data.error === 'Invalid credentials';
    }
  );

  // Test 11: Verify Token
  if (authToken) {
    log('\nTest 11: Verify Token');
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      assert(response.ok && data.user && data.user.email === testEmail,
        'Verify token',
        'Token verification failed'
      );
    } catch (error) {
      assert(false, 'Verify token', error.message);
    }
  }

  // Test 12: Invalid Token (should fail)
  log('\nTest 12: Invalid Token (should fail)');
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    const data = await response.json();
    assert(!response.ok && data.error === 'Invalid token',
      'Reject invalid token',
      'Should reject invalid token'
    );
  } catch (error) {
    assert(false, 'Reject invalid token', error.message);
  }

  // Test 13: Daily Brief (AI Endpoint)
  log('\nTest 13: Daily Brief (AI Endpoint)');
  await testGet('/api/v1/ai/daily-brief', 'Get daily brief', (data, res) => {
    return res.ok && data.date && data.brief;
  });

  // Test 14: Chat Endpoint
  log('\nTest 14: Chat Endpoint');
  const chatData = await testPost('/api/v1/ai/chat',
    { message: 'Hello' },
    'Chat with AI',
    (data, res) => {
      return res.ok && data.response;
    }
  );

  if (chatData && chatData.response) {
    log(`  Response: ${chatData.response.substring(0, 100)}...`);
  }

  // Test 15: CORS Headers
  log('\nTest 15: CORS Headers');
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { 'Origin': 'http://localhost:3000' }
    });
    const corsHeader = response.headers.get('Access-Control-Allow-Origin');
    assert(corsHeader === '*' || corsHeader === 'http://localhost:3000',
      'CORS headers present',
      'CORS not configured correctly'
    );
  } catch (error) {
    assert(false, 'CORS headers present', error.message);
  }

  // Print Summary
  log('\n=== Test Summary ===');
  log(`Total Tests: ${testsPassed + testsFailed}`);
  log(`Passed: ${testsPassed}`);
  log(`Failed: ${testsFailed}`);
  log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed > 0) {
    log('\n⚠ Some tests failed. Please review the logs above.');
    process.exit(1);
  } else {
    log('\n✓ All tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch(error => {
  log(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
