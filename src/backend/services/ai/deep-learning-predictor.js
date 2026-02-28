/**
 * 深度学习预测服务
 * 使用LSTM和Transformer进行时间序列价格预测
 *
 * 功能:
 * 1. LSTM网络预测
 * 2. Transformer架构预测
 * 3. 注意力机制
 * 4. 多特征融合
 * 5. 序列建模
 */

const { Pool } = require('pg');

class DeepLearningPredictor {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 模型配置
    this.models = {
      lstm: {
        name: 'LSTM',
        enabled: true,
        config: {
          inputSize: 11,        // 输入特征数
          hiddenSize: 64,       // LSTM隐藏层大小
          numLayers: 2,         // LSTM层数
          outputSize: 1,        // 输出大小
          sequenceLength: 30,   // 序列长度
          dropout: 0.2,
          learningRate: 0.001
        },
        weights: null,
        accuracy: null
      },
      transformer: {
        name: 'Transformer',
        enabled: true,
        config: {
          inputSize: 11,
          numHeads: 4,          // 注意力头数
          numLayers: 2,         // Transformer层数
          dimModel: 64,         // 模型维度
          dimFeedForward: 256,  // 前馈网络维度
          sequenceLength: 30,
          dropout: 0.1,
          learningRate: 0.0001
        },
        weights: null,
        accuracy: null
      }
    };
  }

  /**
   * 深度学习预测
   * @param {string} stockCode - 股票代码
   * @param {number} days - 预测天数
   * @param {object} options - 选项
   */
  async predictWithDeepLearning(stockCode, days = 1, options = {}) {
    try {
      console.log(`\n🧠 深度学习预测: ${stockCode} (${days}天)`);

      const {
        useLSTM = true,
        useTransformer = true,
        sequenceLength = 30
      } = options;

      // 1. 获取和准备数据
      console.log('1️⃣  获取数据...');
      const data = await this.getTrainingData(stockCode, sequenceLength + 50);

      if (data.length < sequenceLength) {
        throw new Error(`数据不足，至少需要${sequenceLength}天历史数据`);
      }

      // 2. 特征工程
      console.log('2️⃣  特征工程...');
      const { features, labels, scaler } = this.prepareFeatures(data, sequenceLength);

      // 3. 创建序列
      console.log('3️⃣  创建序列...');
      const { trainX, trainY, testX, testY } = this.createSequences(
        features, labels, sequenceLength
      );

      // 4. 训练和预测
      console.log('4️⃣  训练模型...');
      const predictions = {};

      if (useLSTM) {
        const lstmResult = await this.trainAndPredictLSTM(
          trainX, trainY, testX, testY
        );
        predictions.lstm = lstmResult;
      }

      if (useTransformer) {
        const transformerResult = await this.trainAndPredictTransformer(
          trainX, trainY, testX, testY
        );
        predictions.transformer = transformerResult;
      }

      // 5. 集成预测
      console.log('5️⃣  集成预测...');
      const ensemble = this.ensembleDeepLearning(predictions);

      // 6. 反归一化
      const predictedPrice = this.inverseTransform(
        ensemble.predictedPrice,
        scaler
      );

      const currentPrice = data[data.length - 1].close;
      const predictedChange = predictedPrice - currentPrice;
      const predictedChangePercent = (predictedChange / currentPrice) * 100;

      const result = {
        stockCode: stockCode,
        predictionDate: new Date().toISOString(),
        predictDays: days,
        method: 'deep_learning',

        // 集成预测
        ensemble: {
          predictedPrice: predictedPrice,
          predictedChange: predictedChange,
          predictedChangePercent: predictedChangePercent,
          direction: predictedChangePercent > 0.5 ? 'up' :
                   predictedChangePercent < -0.5 ? 'down' : 'neutral',
          confidence: ensemble.confidence
        },

        // 各模型预测
        models: predictions,

        // 当前价格
        currentPrice: currentPrice,

        // 注意力权重 (Transformer)
        attentionWeights: predictions.transformer ?
          predictions.transformer.attentionWeights : null,

        // 技术指标
        modelAccuracy: this.calculateModelAccuracy(predictions, testY)
      };

      console.log(`✅ 深度学习预测完成:`);
      console.log(`   预测价格: ${result.ensemble.predictedPrice.toFixed(2)}`);
      console.log(`   预测涨跌: ${result.ensemble.predictedChangePercent.toFixed(2)}%`);
      console.log(`   方向: ${result.ensemble.direction}`);
      console.log(`   置信度: ${result.ensemble.confidence.toFixed(2)}%`);

      return result;

    } catch (error) {
      console.error(`❌ 深度学习预测失败: ${error.message}`);
      return this.getFallbackPrediction(stockCode);
    }
  }

  /**
   * 获取训练数据
   */
  async getTrainingData(stockCode, minDays) {
    try {
      const query = `
        SELECT *
        FROM market_data
        WHERE stock_code = $1
        ORDER BY trade_date ASC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [stockCode, minDays * 2]);

      if (result.rows.length === 0) {
        console.log('⚠️  数据库无数据，使用模拟数据');
        return this.generateMockData(minDays * 2);
      }

      const data = result.rows.map(row => ({
        date: row.trade_date,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseFloat(row.volume),
        ma5: parseFloat(row.ma5 || 0),
        ma10: parseFloat(row.ma10 || 0),
        ma20: parseFloat(row.ma20 || 0),
        rsi6: parseFloat(row.rsi6 || 50)
      }));

      console.log(`✅ 获取 ${data.length} 天历史数据`);
      return data;

    } catch (error) {
      console.error(`获取数据失败: ${error.message}`);
      return this.generateMockData(minDays * 2);
    }
  }

  /**
   * 准备特征
   */
  prepareFeatures(data, sequenceLength) {
    const features = [];
    const labels = [];

    // 计算技术指标和归一化
    for (let i = 0; i < data.length - 1; i++) {
      const item = data[i];

      // 价格变化率
      const priceChange = i > 0 ? (item.close - data[i - 1].close) / data[i - 1].close : 0;
      const volumeChange = i > 0 ? (item.volume - data[i - 1].volume) / (data[i - 1].volume || 1) : 0;

      // 波动率
      const volatility = item.high > 0 ? (item.high - item.low) / item.close : 0;

      // 动量
      const momentum = item.close - (item.ma20 || item.close);

      // 特征向量: 11维
      const feature = [
        priceChange,           // 1. 价格变化率
        volumeChange,          // 2. 成交量变化率
        volatility,            // 3. 波动率
        momentum,              // 4. 动量
        item.close,            // 5. 收盘价
        item.volume / 1e6,     // 6. 成交量 (百万)
        item.ma5 || item.close,// 7. MA5
        item.ma10 || item.close,// 8. MA10
        item.ma20 || item.close,// 9. MA20
        item.rsi6 || 50,       // 10. RSI6
        (item.high - item.low) / item.close  // 11. 日内波动
      ];

      features.push(feature);
      labels.push(data[i + 1].close);
    }

    // 归一化 (Min-Max)
    const scaler = this.fitScaler(features);
    const normalizedFeatures = features.map(f =>
      f.map((v, i) => this.normalize(v, scaler.min[i], scaler.max[i]))
    );

    return {
      features: normalizedFeatures,
      labels: labels,
      scaler: scaler
    };
  }

  /**
   * 创建序列
   */
  createSequences(features, labels, sequenceLength) {
    const X = [];
    const y = [];

    for (let i = sequenceLength; i < features.length; i++) {
      X.push(features.slice(i - sequenceLength, i));
      y.push(labels[i]);
    }

    // 划分训练集和测试集 (80/20)
    const splitIndex = Math.floor(X.length * 0.8);

    return {
      trainX: X.slice(0, splitIndex),
      trainY: y.slice(0, splitIndex),
      testX: X.slice(splitIndex),
      testY: y.slice(splitIndex)
    };
  }

  /**
   * 训练和预测LSTM
   */
  async trainAndPredictLSTM(trainX, trainY, testX, testY) {
    console.log('🔄 训练LSTM...');

    // 简化的LSTM实现 (实际应用应使用TensorFlow.js或类似库)
    const lstm = new SimpleLSTM(this.models.lstm.config);

    // 训练
    const epochs = 50;
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < trainX.length; i++) {
        lstm.train(trainX[i], trainY[i]);
      }
    }

    // 预测
    const predictions = testX.map(x => lstm.predict(x));
    const mse = this.calculateMSE(predictions, testY);
    const accuracy = this.calculateAccuracy(predictions, testY);

    console.log(`✅ LSTM训练完成: RMSE=${Math.sqrt(mse).toFixed(4)}, 准确率=${accuracy.toFixed(2)}%`);

    return {
      algorithm: 'LSTM',
      predictions: predictions,
      predictedPrice: predictions[predictions.length - 1],
      mse: mse,
      accuracy: accuracy,
      config: this.models.lstm.config
    };
  }

  /**
   * 训练和预测Transformer
   */
  async trainAndPredictTransformer(trainX, trainY, testX, testY) {
    console.log('🔮 训练Transformer...');

    // 简化的Transformer实现
    const transformer = new SimpleTransformer(this.models.transformer.config);

    // 训练
    const epochs = 50;
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < trainX.length; i++) {
        transformer.train(trainX[i], trainY[i]);
      }
    }

    // 预测
    const predictions = testX.map(x => transformer.predict(x));
    const mse = this.calculateMSE(predictions, testY);
    const accuracy = this.calculateAccuracy(predictions, testY);

    // 注意力权重 (简化)
    const attentionWeights = this.calculateAttentionWeights(testX[testX.length - 1]);

    console.log(`✅ Transformer训练完成: RMSE=${Math.sqrt(mse).toFixed(4)}, 准确率=${accuracy.toFixed(2)}%`);

    return {
      algorithm: 'Transformer',
      predictions: predictions,
      predictedPrice: predictions[predictions.length - 1],
      mse: mse,
      accuracy: accuracy,
      attentionWeights: attentionWeights,
      config: this.models.transformer.config
    };
  }

  /**
   * 集成深度学习预测
   */
  ensembleDeepLearning(predictions) {
    const models = Object.values(predictions).filter(p => p.predictedPrice !== undefined);
    if (models.length === 0) {
      return {
        predictedPrice: 0,
        confidence: 0
      };
    }

    // 加权平均 (基于准确率)
    let totalWeight = 0;
    let weightedSum = 0;

    models.forEach(model => {
      const weight = model.accuracy || 50;
      weightedSum += model.predictedPrice * weight;
      totalWeight += weight;
    });

    const predictedPrice = weightedSum / totalWeight;

    // 置信度 (基于模型一致性)
    const values = models.map(m => m.predictedPrice);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const confidence = Math.max(0, Math.min(100, 100 - variance * 100));

    return {
      predictedPrice,
      confidence
    };
  }

  /**
   * 计算注意力权重
   */
  calculateAttentionWeights(sequence) {
    // 简化的注意力权重计算
    const weights = [];
    for (let i = 0; i < sequence.length; i++) {
      // 越接近当前时间，权重越大
      weights.push((i + 1) / sequence.length);
    }
    return weights;
  }

  /**
   * 计算模型准确率
   */
  calculateModelAccuracy(predictions, actual) {
    const accuracy = {};

    for (const [name, model] of Object.entries(predictions)) {
      if (model.predictedPrice !== undefined) {
        accuracy[name] = {
          mse: model.mse,
          rmse: Math.sqrt(model.mse),
          accuracy: model.accuracy
        };
      }
    }

    return accuracy;
  }

  // ============ 辅助方法 ============

  fitScaler(features) {
    const numFeatures = features[0].length;
    const min = new Array(numFeatures).fill(Infinity);
    const max = new Array(numFeatures).fill(-Infinity);

    features.forEach(feature => {
      feature.forEach((val, i) => {
        if (val < min[i]) min[i] = val;
        if (val > max[i]) max[i] = val;
      });
    });

    return { min, max };
  }

  normalize(value, min, max) {
    if (max - min === 0) return 0;
    return (value - min) / (max - min);
  }

  inverseTransform(normalizedValue, scaler) {
    // 简化: 使用close price的反归一化
    const idx = 4; // close price index
    const min = scaler.min[idx];
    const max = scaler.max[idx];
    return normalizedValue * (max - min) + min;
  }

  calculateMSE(predictions, actual) {
    if (predictions.length !== actual.length) return 0;
    const sum = predictions.reduce((sum, pred, i) =>
      sum + Math.pow(pred - actual[i], 2), 0
    );
    return sum / predictions.length;
  }

  calculateAccuracy(predictions, actual, threshold = 0.05) {
    if (predictions.length !== actual.length) return 0;
    let correct = 0;
    predictions.forEach((pred, i) => {
      const error = Math.abs((pred - actual[i]) / actual[i]);
      if (error < threshold) correct++;
    });
    return (correct / predictions.length) * 100;
  }

  generateMockData(days) {
    const data = [];
    const basePrice = 12.50;
    const baseDate = new Date('2024-01-01');

    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const change = (Math.random() - 0.5) * 0.5;
      const price = basePrice + change * 10 + Math.sin(i / 10) * 2;

      data.push({
        date: date.toISOString().split('T')[0],
        open: price * (1 + Math.random() * 0.01),
        high: price * (1 + Math.random() * 0.02),
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume: Math.floor(Math.random() * 1000000 + 100000),
        ma5: price,
        ma10: price,
        ma20: price,
        rsi6: 50 + Math.random() * 20
      });
    }

    return data;
  }

  getFallbackPrediction(stockCode) {
    return {
      stockCode: stockCode,
      predictionDate: new Date().toISOString(),
      predictDays: 1,
      method: 'deep_learning',
      ensemble: {
        predictedPrice: 12.50,
        predictedChange: 0,
        predictedChangePercent: 0,
        direction: 'neutral',
        confidence: 50
      },
      models: {},
      currentPrice: 12.50,
      warning: '深度学习预测失败，返回默认值'
    };
  }
}

// ============ 简化的神经网络类 ============

class SimpleLSTM {
  constructor(config) {
    this.config = config;
    this.inputSize = config.inputSize;
    this.hiddenSize = config.hiddenSize;
    this.outputSize = config.outputSize;

    // 简化的权重
    this.weights = {
      Wf: this.randomMatrix(this.hiddenSize, this.inputSize + this.hiddenSize),
      Wi: this.randomMatrix(this.hiddenSize, this.inputSize + this.hiddenSize),
      Wo: this.randomMatrix(this.hiddenSize, this.inputSize + this.hiddenSize),
      Wc: this.randomMatrix(this.hiddenSize, this.inputSize + this.hiddenSize),
      Wy: this.randomMatrix(this.outputSize, this.hiddenSize)
    };
  }

  randomMatrix(rows, cols) {
    return Array(rows).fill(0).map(() =>
      Array(cols).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
  }

  train(sequence, target) {
    // 简化的训练: 单步预测
    let hidden = new Array(this.hiddenSize).fill(0);
    let cell = new Array(this.hiddenSize).fill(0);

    for (const step of sequence) {
      const input = [...step, ...hidden];
      // LSTM cell (简化)
      const f = this.sigmoid(this.dot(this.weights.Wf, input));
      const i = this.sigmoid(this.dot(this.weights.Wi, input));
      const o = this.sigmoid(this.dot(this.weights.Wo, input));
      const c = this.tanh(this.dot(this.weights.Wc, input));

      cell = cell.map((c_t, t) => f[t] * c_t + i[t] * c[t]);
      hidden = cell.map((c_t, t) => o[t] * Math.tanh(c_t));

      // 简化的权重更新
      this.updateWeights(target, hidden);
    }
  }

  predict(sequence) {
    let hidden = new Array(this.hiddenSize).fill(0);
    let cell = new Array(this.hiddenSize).fill(0);

    for (const step of sequence) {
      const input = [...step, ...hidden];
      const f = this.sigmoid(this.dot(this.weights.Wf, input));
      const i = this.sigmoid(this.dot(this.weights.Wi, input));
      const o = this.sigmoid(this.dot(this.weights.Wo, input));
      const c = this.tanh(this.dot(this.weights.Wc, input));

      cell = cell.map((c_t, t) => f[t] * c_t + i[t] * c[t]);
      hidden = cell.map((c_t, t) => o[t] * Math.tanh(c_t));
    }

    const output = this.dot(this.weights.Wy, hidden);
    return output[0];
  }

  updateWeights(target, hidden) {
    // 简化的梯度下降
    const learningRate = this.config.learningRate || 0.001;
    const output = this.dot(this.weights.Wy, hidden);
    const error = target - output[0];

    // 简化的权重更新
    for (let i = 0; i < this.weights.Wy.length; i++) {
      for (let j = 0; j < this.weights.Wy[i].length; j++) {
        this.weights.Wy[i][j] += learningRate * error * hidden[j] * 0.01;
      }
    }
  }

  dot(matrix, vector) {
    return matrix.map(row =>
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  sigmoid(x) {
    return x.map(v => 1 / (1 + Math.exp(-v)));
  }

  tanh(x) {
    return x.map(v => Math.tanh(v));
  }
}

class SimpleTransformer {
  constructor(config) {
    this.config = config;
    this.inputSize = config.inputSize;
    this.numHeads = config.numHeads;
    this.dimModel = config.dimModel;

    // 简化的权重
    this.Wq = this.randomMatrix(config.dimModel, config.inputSize);
    this.Wk = this.randomMatrix(config.dimModel, config.inputSize);
    this.Wv = this.randomMatrix(config.dimModel, config.inputSize);
    this.Wo = this.randomMatrix(1, config.dimModel);
  }

  randomMatrix(rows, cols) {
    return Array(rows).fill(0).map(() =>
      Array(cols).fill(0).map(() => (Math.random() - 0.5) * 0.1)
    );
  }

  train(sequence, target) {
    // 简化的自注意力机制
    const attention = this.selfAttention(sequence);
    const output = this.dot(this.Wo, attention);

    const error = target - output[0];
    this.updateWeights(error, attention);
  }

  predict(sequence) {
    const attention = this.selfAttention(sequence);
    const output = this.dot(this.Wo, attention);
    return output[0];
  }

  selfAttention(sequence) {
    // 简化的自注意力
    const Q = this.dotMatrix(this.Wq, sequence);
    const K = this.dotMatrix(this.Wk, sequence);
    const V = this.dotMatrix(this.Wv, sequence);

    // 计算注意力分数
    const scores = this.matmul(Q, this.transpose(K));
    const attention = this.softmax(scores);
    const output = this.matmul(attention, V);

    return output.reduce((sum, row) => sum.concat(row), []);
  }

  updateWeights(error, attention) {
    const learningRate = this.config.learningRate || 0.0001;
    for (let i = 0; i < this.Wo.length; i++) {
      for (let j = 0; j < this.Wo[i].length; j++) {
        this.Wo[i][j] += learningRate * error * attention[j] * 0.01;
      }
    }
  }

  dotMatrix(matrix, sequence) {
    return sequence.map(vec =>
      this.dot(matrix, vec)
    );
  }

  dot(matrix, vector) {
    return matrix.map(row =>
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  matmul(A, B) {
    return A.map((row, i) =>
      B[0].map((_, j) =>
        row.reduce((sum, _, k) => sum + A[i][k] * B[k][j], 0)
      )
    );
  }

  transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  softmax(matrix) {
    return matrix.map(row => {
      const max = Math.max(...row);
      const exp = row.map(v => Math.exp(v - max));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map(v => v / sum);
    });
  }
}

module.exports = new DeepLearningPredictor();
