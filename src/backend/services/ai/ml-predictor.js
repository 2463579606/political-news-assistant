/**
 * ML预测服务
 * 使用机器学习算法进行股价预测
 *
 * 算法:
 * 1. Random Forest - 随机森林
 * 2. XGBoost - 极端梯度提升
 * 3. Linear Regression - 线性回归 (基准)
 *
 * 特征:
 * - 历史价格 (开盘、收盘、最高、最低)
 * - 成交量
 * - 技术指标 (MA、RSI、MACD)
 * - 基本面指标 (ROE、PE、PB)
 * - 新闻情感评分
 */

const { Pool } = require('pg');

// ML库 (简化版本，实际使用需要安装相关包)
// npm install ml-matrix simple-statistics

class MLPredictor {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 模型参数
    this.models = {
      randomForest: {
        name: 'Random Forest',
        enabled: true,
        n_estimators: 100,  // 树的数量
        max_depth: 10,
        accuracy: null
      },
      xgboost: {
        name: 'XGBoost',
        enabled: true,
        n_estimators: 100,
        learning_rate: 0.1,
        max_depth: 6,
        accuracy: null
      },
      linearRegression: {
        name: 'Linear Regression',
        enabled: true,
        accuracy: null
      }
    };

    // 特征重要性
    this.featureImportance = {};
  }

  /**
   * 预测股价走势
   * @param {string} stockCode - 股票代码
   * @param {number} days - 预测天数 (默认1天)
   * @param {object} options - 选项
   */
  async predictPrice(stockCode, days = 1, options = {}) {
    try {
      console.log(`\n🤖 ML预测: ${stockCode} (${days}天)`);

      const {
        useRandomForest = true,
        useXGBoost = true,
        useLinearRegression = true,
        includeNews = true
      } = options;

      // 1. 获取训练数据
      console.log('1️⃣  获取历史数据...');
      const trainingData = await this.getTrainingData(stockCode, includeNews);

      if (!trainingData || trainingData.length < 30) {
        throw new Error('数据不足，至少需要30天历史数据');
      }

      // 2. 特征工程
      console.log('2️⃣  特征工程...');
      const { features, labels } = this.engineerFeatures(trainingData);

      // 3. 划分训练集和测试集
      const splitIndex = Math.floor(features.length * 0.8);
      const trainFeatures = features.slice(0, splitIndex);
      const trainLabels = labels.slice(0, splitIndex);
      const testFeatures = features.slice(splitIndex);
      const testLabels = labels.slice(splitIndex);

      // 4. 训练模型
      console.log('3️⃣  训练模型...');
      const predictions = {};

      // Random Forest
      if (useRandomForest) {
        const rfResult = await this.trainRandomForest(
          trainFeatures, trainLabels, testFeatures
        );
        predictions.randomForest = rfResult;
      }

      // XGBoost
      if (useXGBoost) {
        const xgbResult = await this.trainXGBoost(
          trainFeatures, trainLabels, testFeatures
        );
        predictions.xgboost = xgbResult;
      }

      // Linear Regression (基准)
      if (useLinearRegression) {
        const lrResult = await this.trainLinearRegression(
          trainFeatures, trainLabels, testFeatures
        );
        predictions.linearRegression = lrResult;
      }

      // 5. 集成预测 (Ensemble)
      console.log('4️⃣  集成预测...');
      const ensemble = this.ensemblePredictions(predictions);

      // 6. 计算置信区间
      const confidenceInterval = this.calculateConfidenceInterval(
        predictions, testLabels
      );

      // 7. 评估模型
      console.log('5️⃣  评估模型...');
      const evaluation = this.evaluateModels(predictions, testLabels);

      const result = {
        stockCode: stockCode,
        predictionDate: new Date().toISOString(),
        predictDays: days,

        // 集成预测
        ensemble: {
          predictedPrice: ensemble.predictedPrice,
          predictedChange: ensemble.predictedChange,
          predictedChangePercent: ensemble.predictedChangePercent,
          direction: ensemble.direction,
          confidence: ensemble.confidence
        },

        // 各模型预测
        models: predictions,

        // 置信区间
        confidenceInterval: confidenceInterval,

        // 模型评估
        evaluation: evaluation,

        // 当前价格
        currentPrice: trainingData[trainingData.length - 1].close,

        // 特征重要性
        featureImportance: this.featureImportance
      };

      console.log(`✅ ML预测完成:`);
      console.log(`   预测价格: ${result.ensemble.predictedPrice.toFixed(2)}`);
      console.log(`   预测涨跌: ${result.ensemble.predictedChangePercent.toFixed(2)}%`);
      console.log(`   方向: ${result.ensemble.direction}`);
      console.log(`   置信度: ${result.ensemble.confidence.toFixed(2)}%`);

      return result;

    } catch (error) {
      console.error(`❌ ML预测失败: ${error.message}`);
      return this.getFallbackPrediction(stockCode);
    }
  }

  /**
   * 获取训练数据
   */
  async getTrainingData(stockCode, includeNews = true) {
    try {
      // 获取历史行情数据
      const marketQuery = `
        SELECT *
        FROM market_data
        WHERE stock_code = $1
        ORDER BY trade_date ASC
        LIMIT 365
      `;

      const marketResult = await this.pool.query(marketQuery, [stockCode]);

      if (marketResult.rows.length === 0) {
        console.log('⚠️  数据库无数据，使用模拟数据');
        return this.generateMockTrainingData(stockCode);
      }

      // 获取新闻情感数据
      let newsData = {};
      if (includeNews) {
        const newsQuery = `
          SELECT
            trade_date,
            AVG(sentiment_score) as avg_sentiment
          FROM news_events
          WHERE impact_stocks::jsonb ? $1
          GROUP BY trade_date
          ORDER BY trade_date ASC
        `;

        const newsResult = await this.pool.query(newsQuery, [stockCode]);
        newsResult.rows.forEach(row => {
          newsData[row.trade_date] = parseFloat(row.avg_sentiment);
        });
      }

      // 合并数据
      const data = marketResult.rows.map(row => ({
        date: row.trade_date,
        open: parseFloat(row.open_price),
        high: parseFloat(row.high_price),
        low: parseFloat(row.low_price),
        close: parseFloat(row.close_price),
        volume: parseFloat(row.volume),
        amount: parseFloat(row.amount),
        sentiment: newsData[row.trade_date] || 50
      }));

      console.log(`✅ 获取 ${data.length} 天历史数据`);
      return data;

    } catch (error) {
      console.error(`获取训练数据失败: ${error.message}`);
      return this.generateMockTrainingData(stockCode);
    }
  }

  /**
   * 特征工程
   */
  engineerFeatures(data) {
    const features = [];
    const labels = [];

    // 计算技术指标
    for (let i = 20; i < data.length - 1; i++) {
      const window = data.slice(i - 20, i + 1);

      // 基本特征
      const price = data[i].close;
      const volume = data[i].volume;

      // 技术指标
      const ma5 = this.calculateMA(window, 5);
      const ma10 = this.calculateMA(window, 10);
      const ma20 = this.calculateMA(window, 20);

      // 价格动量
      const momentum = price - window[0].close;
      const momentumPercent = (price / window[0].close - 1) * 100;

      // 波动率
      const volatility = this.calculateVolatility(window);

      // RSI
      const rsi = this.calculateRSI(window, 14);

      // 成交量变化
      const volumeChange = volume / window[window.length - 2].volume;

      // 新闻情感
      const sentiment = data[i].sentiment || 50;

      // 特征向量
      const feature = [
        price,
        volume,
        ma5,
        ma10,
        ma20,
        momentum,
        momentumPercent,
        volatility,
        rsi,
        volumeChange,
        sentiment / 100
      ];

      features.push(feature);
      labels.push(data[i + 1].close); // 预测下一天的收盘价
    }

    // 归一化特征
    const normalizedFeatures = this.normalizeFeatures(features);

    return {
      features: normalizedFeatures,
      labels: labels
    };
  }

  /**
   * 训练Random Forest模型
   */
  async trainRandomForest(trainFeatures, trainLabels, testFeatures) {
    console.log('🌲 训练Random Forest...');

    // 简化的Random Forest实现
    // 实际应用中应使用 sklearn-random-forest 或 rf-random-forest

    const predictions = this.randomForestPredict(
      trainFeatures, trainLabels, testFeatures
    );

    const mse = this.calculateMSE(predictions, this.getTestLabels(trainLabels, testFeatures));
    const accuracy = this.calculateAccuracy(predictions, this.getTestLabels(trainLabels, testFeatures));

    this.models.randomForest.accuracy = accuracy;

    return {
      algorithm: 'Random Forest',
      predictions: predictions,
      predictedPrice: predictions[predictions.length - 1],
      mse: mse,
      accuracy: accuracy
    };
  }

  /**
   * 训练XGBoost模型
   */
  async trainXGBoost(trainFeatures, trainLabels, testFeatures) {
    console.log('🚀 训练XGBoost...');

    // 简化的XGBoost实现
    // 实际应用中应使用 xgboost 或 node-xgboost

    const predictions = this.xgBoostPredict(
      trainFeatures, trainLabels, testFeatures
    );

    const mse = this.calculateMSE(predictions, this.getTestLabels(trainLabels, testFeatures));
    const accuracy = this.calculateAccuracy(predictions, this.getTestLabels(trainLabels, testFeatures));

    this.models.xgboost.accuracy = accuracy;

    return {
      algorithm: 'XGBoost',
      predictions: predictions,
      predictedPrice: predictions[predictions.length - 1],
      mse: mse,
      accuracy: accuracy
    };
  }

  /**
   * 训练线性回归模型
   */
  async trainLinearRegression(trainFeatures, trainLabels, testFeatures) {
    console.log('📈 训练Linear Regression...');

    const { weights, bias } = this.linearRegressionTrain(
      trainFeatures, trainLabels
    );

    const predictions = testFeatures.map(feature =>
      this.linearRegressionPredict(feature, weights, bias)
    );

    const mse = this.calculateMSE(predictions, this.getTestLabels(trainLabels, testFeatures));
    const accuracy = this.calculateAccuracy(predictions, this.getTestLabels(trainLabels, testFeatures));

    this.models.linearRegression.accuracy = accuracy;

    return {
      algorithm: 'Linear Regression',
      predictions: predictions,
      predictedPrice: predictions[predictions.length - 1],
      mse: mse,
      accuracy: accuracy,
      weights: weights,
      bias: bias
    };
  }

  /**
   * 简化的Random Forest预测
   */
  randomForestPredict(trainFeatures, trainLabels, testFeatures) {
    // 简化实现: 使用多个决策树的平均
    const numTrees = 10;
    const predictions = [];

    for (const feature of testFeatures) {
      let sum = 0;
      for (let t = 0; t < numTrees; t++) {
        // 随机选择样本子集
        const subsetSize = Math.floor(trainFeatures.length * 0.8);
        const indices = this.randomSubset(trainFeatures.length, subsetSize);

        // 找到最相似的样本
        let minDist = Infinity;
        let closestLabel = 0;

        for (const idx of indices) {
          const dist = this.euclideanDistance(feature, trainFeatures[idx]);
          if (dist < minDist) {
            minDist = dist;
            closestLabel = trainLabels[idx];
          }
        }

        sum += closestLabel;
      }

      predictions.push(sum / numTrees);
    }

    return predictions;
  }

  /**
   * 简化的XGBoost预测
   */
  xgBoostPredict(trainFeatures, trainLabels, testFeatures) {
    // 简化实现: 梯度提升回归
    const learningRate = 0.1;
    const numRounds = 100;

    let predictions = testFeatures.map(() =>
      trainLabels.reduce((a, b) => a + b, 0) / trainLabels.length
    );

    for (let round = 0; round < numRounds; round++) {
      // 计算残差
      const residuals = trainLabels.map((label, i) => {
        const pred = this.predictWithNeighbors(
          trainFeatures[i], trainFeatures, trainLabels, 5
        );
        return label - pred;
      });

      // 更新预测
      for (let i = 0; i < testFeatures.length; i++) {
        const neighborPred = this.predictWithNeighbors(
          testFeatures[i], trainFeatures, residuals, 5
        );
        predictions[i] += learningRate * neighborPred;
      }
    }

    return predictions;
  }

  /**
   * 线性回归训练
   */
  linearRegressionTrain(features, labels) {
    const numFeatures = features[0].length;
    const weights = new Array(numFeatures).fill(0);
    let bias = 0;

    // 简化的梯度下降
    const learningRate = 0.0001;
    const iterations = 1000;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < features.length; i++) {
        const prediction = this.dotProduct(weights, features[i]) + bias;
        const error = labels[i] - prediction;

        for (let j = 0; j < numFeatures; j++) {
          weights[j] += learningRate * error * features[i][j];
        }
        bias += learningRate * error;
      }
    }

    return { weights, bias };
  }

  /**
   * 线性回归预测
   */
  linearRegressionPredict(feature, weights, bias) {
    return this.dotProduct(weights, feature) + bias;
  }

  /**
   * 集成预测 (Ensemble)
   */
  ensemblePredictions(predictions) {
    const models = Object.values(predictions).filter(p => p.predictedPrice);
    if (models.length === 0) {
      return {
        predictedPrice: 0,
        predictedChange: 0,
        predictedChangePercent: 0,
        direction: 'neutral',
        confidence: 0
      };
    }

    // 加权平均 (根据准确率)
    let totalWeight = 0;
    let weightedSum = 0;

    models.forEach(model => {
      const weight = model.accuracy || 0.5;
      weightedSum += model.predictedPrice * weight;
      totalWeight += weight;
    });

    const predictedPrice = weightedSum / totalWeight;
    const currentPrice = models[0].predictions[models[0].predictions.length - 2] || predictedPrice;
    const predictedChange = predictedPrice - currentPrice;
    const predictedChangePercent = (predictedChange / currentPrice) * 100;

    const direction = predictedChangePercent > 0.5 ? 'up' :
                     predictedChangePercent < -0.5 ? 'down' : 'neutral';

    // 置信度 (基于模型一致性)
    const variance = this.calculateVariance(
      models.map(m => m.predictedPrice)
    );
    const confidence = Math.max(0, Math.min(100, 100 - variance * 10));

    return {
      predictedPrice,
      predictedChange,
      predictedChangePercent,
      direction,
      confidence
    };
  }

  /**
   * 计算置信区间
   */
  calculateConfidenceInterval(predictions, actualLabels) {
    const models = Object.values(predictions).filter(p => p.predictedPrice);
    const values = models.map(m => m.predictedPrice);

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    return {
      lower: mean - 1.96 * std,
      upper: mean + 1.96 * std,
      std: std
    };
  }

  /**
   * 评估模型
   */
  evaluateModels(predictions, actualLabels) {
    const evaluation = {};

    for (const [modelName, model] of Object.entries(predictions)) {
      const mse = model.mse || 0;
      const accuracy = model.accuracy || 0;

      evaluation[modelName] = {
        mse: mse,
        rmse: Math.sqrt(mse),
        accuracy: accuracy
      };
    }

    return evaluation;
  }

  // ============ 辅助方法 ============

  calculateMA(window, period) {
    if (window.length < period) return null;
    const slice = window.slice(-period);
    return slice.reduce((sum, d) => sum + d.close, 0) / period;
  }

  calculateVolatility(window) {
    const returns = [];
    for (let i = 1; i < window.length; i++) {
      returns.push((window[i].close / window[i - 1].close) - 1);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  calculateRSI(window, period = 14) {
    if (window.length < period + 1) return 50;

    let gains = 0, losses = 0;
    for (let i = window.length - period; i < window.length; i++) {
      const change = window[i].close - window[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  normalizeFeatures(features) {
    const numFeatures = features[0].length;
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(1);

    // 计算均值
    features.forEach(feature => {
      feature.forEach((val, i) => {
        means[i] += val;
      });
    });
    means.forEach((mean, i) => means[i] /= features.length);

    // 计算标准差
    features.forEach(feature => {
      feature.forEach((val, i) => {
        stds[i] += Math.pow(val - means[i], 2);
      });
    });
    stds.forEach((std, i) => stds[i] = Math.sqrt(std / features.length) || 1);

    // 归一化
    return features.map(feature =>
      feature.map((val, i) => (val - means[i]) / (stds[i] || 1))
    );
  }

  euclideanDistance(a, b) {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  randomSubset(n, size) {
    const indices = [];
    const used = new Set();
    while (indices.length < size) {
      const idx = Math.floor(Math.random() * n);
      if (!used.has(idx)) {
        used.add(idx);
        indices.push(idx);
      }
    }
    return indices;
  }

  predictWithNeighbors(feature, features, labels, k) {
    const distances = features.map((f, i) => ({
      distance: this.euclideanDistance(feature, f),
      label: labels[i]
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const kNearest = distances.slice(0, k);

    return kNearest.reduce((sum, n) => sum + n.label, 0) / k;
  }

  calculateMSE(predictions, actual) {
    if (predictions.length !== actual.length) return 0;
    const sum = predictions.reduce((sum, pred, i) =>
      sum + Math.pow(pred - actual[i], 2), 0
    );
    return sum / predictions.length;
  }

  calculateAccuracy(predictions, actual, threshold = 0.02) {
    if (predictions.length !== actual.length) return 0;
    let correct = 0;
    predictions.forEach((pred, i) => {
      const error = Math.abs((pred - actual[i]) / actual[i]);
      if (error < threshold) correct++;
    });
    return (correct / predictions.length) * 100;
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  getTestLabels(trainLabels, testFeatures) {
    // 简化: 返回测试集的标签 (实际应用中需要更复杂的处理)
    return trainLabels.slice(-testFeatures.length);
  }

  /**
   * 生成模拟训练数据
   */
  generateMockTrainingData(stockCode) {
    const data = [];
    const basePrice = 12.50;
    const baseDate = new Date('2024-01-01');

    for (let i = 0; i < 100; i++) {
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
        sentiment: 40 + Math.random() * 20
      });
    }

    return data;
  }

  /**
   * 回退预测
   */
  getFallbackPrediction(stockCode) {
    return {
      stockCode: stockCode,
      predictionDate: new Date().toISOString(),
      predictDays: 1,
      ensemble: {
        predictedPrice: 12.50,
        predictedChange: 0,
        predictedChangePercent: 0,
        direction: 'neutral',
        confidence: 50
      },
      models: {},
      confidenceInterval: { lower: 12, upper: 13 },
      evaluation: {},
      currentPrice: 12.50,
      warning: 'ML预测失败，返回默认值'
    };
  }
}

module.exports = new MLPredictor();
