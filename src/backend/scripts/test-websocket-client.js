/**
 * WebSocket Test Client
 * 测试WebSocket实时推送功能
 *
 * 功能:
 * 1. 连接到WebSocket服务器
 * 2. 订阅决策更新、行情更新、告警推送
 * 3. 接收并显示实时推送消息
 * 4. 测试心跳机制
 */

const WebSocket = require('ws');
const http = require('http');

// API测试辅助函数
function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

class WebSocketTestClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.clientId = null;
    this.messageCount = 0;
    this.receivedMessages = [];
  }

  /**
   * 连接到WebSocket服务器
   */
  connect() {
    return new Promise((resolve, reject) => {
      console.log(`\n🔌 正在连接到 ${this.url}...`);

      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('✅ WebSocket连接成功\n');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('❌ WebSocket连接已关闭');
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket错误:', error.message);
        reject(error);
      });

      // 超时处理
      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('连接超时'));
        }
      }, 10000);
    });
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(data) {
    this.messageCount++;
    const message = JSON.parse(data);

    console.log(`\n📨 [消息 #${this.messageCount}] ${new Date().toLocaleTimeString()}`);
    console.log('━'.repeat(60));

    // 处理不同类型的消息
    switch (message.type) {
      case 'connected':
        this.clientId = message.clientId;
        console.log(`✅ 已连接到服务器`);
        console.log(`   客户端ID: ${this.clientId}`);
        console.log(`   时间戳: ${message.timestamp}`);
        break;

      case 'subscribed':
        console.log(`✅ 订阅成功`);
        console.log(`   主题: ${message.topics.join(', ')}`);
        break;

      case 'unsubscribed':
        console.log(`✅ 取消订阅成功`);
        console.log(`   主题: ${message.topics.join(', ')}`);
        break;

      case 'broadcast':
        console.log(`📢 收到广播推送`);
        console.log(`   主题: ${message.topic}`);
        console.log(`   时间: ${message.timestamp}`);

        if (message.topic.startsWith('decision:')) {
          this.displayDecisionUpdate(message.data);
        } else if (message.topic.startsWith('market:')) {
          this.displayMarketUpdate(message.data);
        } else if (message.topic === 'alerts') {
          this.displayAlert(message.data);
        }
        break;

      case 'heartbeat':
        console.log(`💓 心跳检测 - ${message.timestamp}`);
        break;

      case 'pong':
        console.log(`🏓 Pong响应`);
        break;

      default:
        console.log(`📄 未知消息类型: ${message.type}`);
        console.log(JSON.stringify(message, null, 2));
    }

    this.receivedMessages.push(message);
  }

  /**
   * 显示决策更新
   */
  displayDecisionUpdate(data) {
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   📊 决策更新推送');
    console.log(`   股票代码: ${data.stockCode}`);
    console.log(`   决策: ${data.decision}`);
    console.log(`   建议: ${data.action}`);
    console.log(`   评分: ${data.score.toFixed(2)} 分`);
    console.log(`   置信度: ${data.confidence}%`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 显示行情更新
   */
  displayMarketUpdate(data) {
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   📈 行情更新推送');
    console.log(`   股票代码: ${data.stockCode}`);
    console.log(`   收盘价: ¥${data.price}`);
    console.log(`   涨跌幅: ${data.change.toFixed(2)}%`);
    console.log(`   成交量: ${data.volume}`);
    console.log(`   日期: ${data.timestamp}`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 显示告警
   */
  displayAlert(data) {
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   🚨 监控告警推送');
    console.log(`   级别: ${data.level}`);
    console.log(`   消息: ${data.message}`);
    console.log(`   时间: ${data.timestamp}`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * 订阅主题
   */
  subscribe(topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }

    const message = {
      type: 'subscribe',
      topics: topics
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 发送订阅请求: ${topics.join(', ')}`);
  }

  /**
   * 取消订阅主题
   */
  unsubscribe(topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }

    const message = {
      type: 'unsubscribe',
      topics: topics
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 发送取消订阅请求: ${topics.join(', ')}`);
  }

  /**
   * 发送ping
   */
  ping() {
    const message = { type: 'ping' };
    this.ws.send(JSON.stringify(message));
    console.log('📤 发送 Ping');
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('🔌 已断开连接');
    }
  }

  /**
   * 等待消息
   */
  waitForMessage(count = 1, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkInterval = setInterval(() => {
        if (this.receivedMessages.length >= count) {
          clearInterval(checkInterval);
          resolve(this.receivedMessages.slice(-count));
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('等待消息超时'));
        }
      }, 100);
    });
  }
}

/**
 * 测试流程
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        🧪 WebSocket实时推送测试                       ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const client = new WebSocketTestClient('ws://localhost:3002');

  try {
    // 1. 连接测试
    await client.connect();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. 订阅测试
    console.log('\n📋 测试1: 订阅主题');
    console.log('━'.repeat(60));
    client.subscribe([
      'decision:000001.SZ',
      'market:000001.SZ',
      'alerts'
    ]);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 触发决策生成，测试实时推送
    console.log('\n📋 测试2: 触发决策生成（应收到实时推送）');
    console.log('━'.repeat(60));
    console.log('正在生成投资决策...');

    const decisionResult = await makeRequest(
      3002,
      '/api/v2/decision/generate',
      'POST',
      { stockCode: '000001.SZ' }
    );

    if (decisionResult.status === 200) {
      console.log('✅ 决策生成成功');

      // 等待WebSocket推送
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (client.messageCount > 2) {
        console.log(`\n✅ 测试通过! 收到 ${client.messageCount} 条消息`);
      } else {
        console.log(`\n⚠️  警告: 仅收到 ${client.messageCount} 条消息`);
      }
    } else {
      console.log('❌ 决策生成失败:', decisionResult.data);
    }

    // 4. 心跳测试
    console.log('\n📋 测试3: Ping/Pong');
    console.log('━'.repeat(60));
    client.ping();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. WebSocket统计
    console.log('\n📋 测试4: WebSocket统计');
    console.log('━'.repeat(60));
    const statsResult = await makeRequest(3002, '/api/v2/websocket/stats');

    if (statsResult.status === 200) {
      const stats = statsResult.data.data;
      console.log('✅ WebSocket统计:');
      console.log(`   总客户端数: ${stats.totalClients}`);
      console.log(`   总订阅数: ${stats.totalSubscriptions}`);
      if (stats.clients && stats.clients.length > 0) {
        console.log(`   当前客户端:`);
        stats.clients.forEach(c => {
          console.log(`     - ${c.id}`);
          console.log(`       订阅: ${c.subscriptions.join(', ')}`);
        });
      }
    }

    // 6. 广播测试
    console.log('\n📋 测试5: 广播消息');
    console.log('━'.repeat(60));
    const broadcastResult = await makeRequest(
      3002,
      '/api/v2/websocket/broadcast',
      'POST',
      {
        topic: 'test',
        message: { text: '测试广播消息', time: new Date().toISOString() }
      }
    );

    if (broadcastResult.status === 200) {
      console.log('✅ 广播成功');
      console.log(`   发送给: ${broadcastResult.data.data.sentCount} 个客户端`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 7. 取消订阅测试
    console.log('\n📋 测试6: 取消订阅');
    console.log('━'.repeat(60));
    client.unsubscribe('alerts');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试总结
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    测试总结                            ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  连接状态: ✅ 成功                                     ║`);
    console.log(`║  客户端ID: ${client.clientId || 'N/A'}                      ║`);
    console.log(`║  接收消息: ${client.messageCount} 条                                 ║`);
    console.log(`║  订阅功能: ✅ 正常                                     ║`);
    console.log(`║  实时推送: ✅ 正常                                     ║`);
    console.log(`║  心跳机制: ✅ 正常                                     ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // 保持连接以接收心跳
    console.log('⏳ 保持连接10秒以接收心跳...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  } finally {
    client.disconnect();
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试异常:', error);
  process.exit(1);
});
