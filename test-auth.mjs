const authService = require('/Users/jiangyz/workspace/projects/political-news-assistant/src/backend/auth-service');

async function testAuth() {
  console.log('=== 测试注册 ===');
  const regResult = await authService.register('test@demo.com', 'testpass123');
  console.log('注册结果:', regResult);

  if (regResult.success) {
    console.log('✓ 注册成功，用户:', regResult.user);
    console.log('Token (如果有的话):', regResult.token);
  }

  console.log('\n=== 测试登录 ===');
  const loginResult = await authService.login('test@demo.com', 'testpass123');
  console.log('登录结果:', loginResult);

  if (loginResult.success) {
    console.log('✓ 登录成功');
    console.log('Token:', loginResult.token);

    console.log('\n=== 测试Token验证 ===');
    if (loginResult.token) {
      const authResult = authService.authenticateToken(loginResult.token);
      console.log('Token验证结果:', authResult);
    }
  }
}

testAuth();
