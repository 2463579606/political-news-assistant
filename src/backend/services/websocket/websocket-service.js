/**
 * WebSocket Service
 * WebSocket实时推送服务
 *
 * 功能:
 * 1. 实时行情推送
 * 2. 决策更新推送
 * 3. 监控告警推送
 * 4. 客户端连接管理
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map(); // clientId -> ws
    this.subscriptions = new Map(); // clientId -> Set of topics
    this.clientIdCounter = 0;
  }

  /**
   * 初始化WebSocket服务器
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();

      console.log(`[WebSocket] 新客户端连接: ${clientId}`);

      // 存储客户端
      this.clients.set(clientId, {
        ws: ws,
        id: clientId,
        connectTime: new Date(),
        ip: req.socket.remoteAddress
      });

      // 初始化订阅列表
      this.subscriptions.set(clientId, new Set());

      // 发送欢迎消息
      this.sendToClient(clientId, {
        type: 'connected',
        clientId: clientId,
        timestamp: new Date().toISOString()
      });

      // 处理消息
      ws.on('message', (message) => {
        this.handleMessage(clientId, message);
      });

      // 处理断开
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // 处理错误
      ws.on('error', (error) => {
        console.error(`[WebSocket] 客户端 ${clientId} 错误:`, error.message);
      });
    });

    console.log('[WebSocket] 服务已启动');
  }

  /**
   * 生成客户端ID
   */
  generateClientId() {
    return `client_${++this.clientIdCounter}_${Date.now()}`;
  }

  /**
   * 处理客户端消息
   */
  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, data.topics);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data.topics);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;
        default:
          console.warn(`[WebSocket] 未知消息类型: ${data.type}`);
      }
    } catch (error) {
      console.error(`[WebSocket] 处理消息失败:`, error.message);
    }
  }

  /**
   * 处理订阅
   */
  handleSubscribe(clientId, topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }

    const clientSubscriptions = this.subscriptions.get(clientId);

    topics.forEach(topic => {
      clientSubscriptions.add(topic);
      console.log(`[WebSocket] 客户端 ${clientId} 订阅: ${topic}`);
    });

    // 确认订阅
    this.sendToClient(clientId, {
      type: 'subscribed',
      topics: topics
    });
  }

  /**
   * 处理取消订阅
   */
  handleUnsubscribe(clientId, topics) {
    if (!Array.isArray(topics)) {
      topics = [topics];
    }

    const clientSubscriptions = this.subscriptions.get(clientId);

    topics.forEach(topic => {
      clientSubscriptions.delete(topic);
      console.log(`[WebSocket] 客户端 ${clientId} 取消订阅: ${topic}`);
    });

    // 确认取消订阅
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      topics: topics
    });
  }

  /**
   * 处理断开
   */
  handleDisconnect(clientId) {
    console.log(`[WebSocket] 客户端断开: ${clientId}`);

    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);

    this.emit('clientDisconnect', { clientId });
  }

  /**
   * 发送消息给指定客户端
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);

    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`[WebSocket] 发送失败给客户端 ${clientId}:`, error.message);
      return false;
    }
  }

  /**
   * 广播消息给所有订阅了指定主题的客户端
   */
  broadcast(topic, data) {
    let sentCount = 0;

    for (const [clientId, subscriptions] of this.subscriptions.entries()) {
      if (subscriptions.has(topic) || subscriptions.has('*')) {
        const success = this.sendToClient(clientId, {
          type: 'broadcast',
          topic: topic,
          data: data,
          timestamp: new Date().toISOString()
        });

        if (success) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  /**
   * 推送决策更新
   */
  pushDecisionUpdate(stockCode, decision) {
    return this.broadcast(`decision:${stockCode}`, {
      type: 'decision_update',
      stockCode: stockCode,
      decision: decision.decision,
      action: decision.action,
      score: decision.totalScore,
      confidence: decision.confidence
    });
  }

  /**
   * 推送市场行情
   */
  pushMarketUpdate(stockCode, marketData) {
    return this.broadcast(`market:${stockCode}`, {
      type: 'market_update',
      stockCode: stockCode,
      price: marketData.close_price,
      change: marketData.change_percent,
      volume: marketData.volume,
      timestamp: marketData.trade_date
    });
  }

  /**
   * 推送监控告警
   */
  pushAlert(alert) {
    return this.broadcast('alerts', {
      type: 'alert',
      level: alert.level,
      message: alert.message,
      timestamp: alert.timestamp
    });
  }

  /**
   * 获取连接统计
   */
  getStats() {
    const stats = {
      totalClients: this.clients.size,
      totalSubscriptions: 0,
      clients: []
    };

    for (const [clientId, subscriptions] of this.subscriptions.entries()) {
      stats.totalSubscriptions += subscriptions.size;

      const client = this.clients.get(clientId);
      if (client) {
        stats.clients.push({
          id: clientId,
          ip: client.ip,
          connectTime: client.connectTime,
          subscriptions: Array.from(subscriptions)
        });
      }
    }

    return stats;
  }

  /**
   * 心跳检测
   */
  startHeartbeat() {
    setInterval(() => {
      const message = {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      };

      let sentCount = 0;
      for (const [clientId, client] of this.clients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            // 连接可能已断开
            console.error(`[WebSocket] 心跳发送失败给 ${clientId}:`, error.message);
          }
        }
      }

      if (sentCount > 0) {
        console.log(`[WebSocket] 心跳已发送: ${sentCount} 个客户端`);
      }
    }, 30000); // 每30秒发送一次心跳
  }
}

// 导出单例
module.exports = new WebSocketService();
