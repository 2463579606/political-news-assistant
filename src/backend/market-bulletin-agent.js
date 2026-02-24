const aiService = require('./ai-service');
const { getPool } = require('./db');
const marketDataService = require('./market-data-service');

/**
 * 智能股市公告Agent
 * 具备记忆、学习、深度分析能力
 * 以资深游资视角进行市场分析
 */
class MarketBulletinAgent {
  constructor() {
    this.name = '股市公告智能助手';
    this.version = '2.0';
    this.persona = `你是一位拥有20年实战经验的资深游资大佬，精通：
1. 宏观经济分析：能够从政策变化中解读市场趋势
2. 行业产业链研究：深入了解各行业的上下游关系和核心驱动因素
3. 资金流向分析：敏锐捕捉主力资金动向和散户情绪变化
4. 技术面研判：结合量价关系、筹码分布等技术指标
5. 题材挖掘：提前发现市场热点和潜在题材
6. 风险控制：精准把握止盈止损时机

你的分析风格：
- 从宏观政策到微观个股，层层递进
- 结合历史案例，类比分析
- 给出明确的操作建议（关注板块、具体标的、买卖时机）
- 提醒风险点，控制回撤
- 用游资的实战语言，通俗易懂又有深度`;
  }

  /**
   * 生成每日股市公告
   * 综合分析时政新闻 + 历史记忆 + 真实市场数据
   */
  async generateDailyBulletin(newsList) {
    try {
      // 1. 从数据库加载历史记忆
      const memory = await this.loadMemory();

      // 2. 获取真实市场数据
      const [marketIndices, marketSentiment, hotSectors] = await Promise.all([
        marketDataService.getMajorIndices(),
        marketDataService.getMarketSentiment(),
        marketDataService.getHotSectors()
      ]);

      // 3. 分析当前新闻
      const newsAnalysis = await this.analyzeNews(newsList);

      // 4. 提取关键政策和事件
      const policyEvents = await this.extractPolicyEvents(newsList);

      // 5. 生成深度分析报告（融合真实数据）
      const bulletin = await this.generateInDepthAnalysis({
        currentNews: newsList,
        newsAnalysis,
        policyEvents,
        historicalMemory: memory,
        currentDate: new Date().toISOString(),
        realTimeData: {
          indices: marketIndices,
          sentiment: marketSentiment,
          sectors: hotSectors
        }
      });

      // 6. 更新记忆库
      await this.updateMemory({
        date: new Date().toISOString(),
        news: newsList,
        analysis: bulletin,
        marketData: {
          indices: marketIndices,
          sentiment: marketSentiment
        }
      });

      return bulletin;
    } catch (error) {
      console.error('生成股市公告失败:', error);
      return this.generateFallbackBulletin(newsList);
    }
  }

  /**
   * 加载历史记忆
   */
  async loadMemory() {
    try {
      const pool = await getPool();
      const [rows] = await pool.query(`
        SELECT data, created_at
        FROM market_memory
        ORDER BY created_at DESC
        LIMIT 30
      `);

      return rows.map(row => ({
        ...JSON.parse(row.data),
        date: row.created_at
      }));
    } catch (error) {
      console.error('加载记忆失败:', error.message);
      return [];
    }
  }

  /**
   * 分析新闻集合
   */
  async analyzeNews(newsList) {
    const categorizedNews = {
      财经: [],
      科技: [],
      国际: [],
      时政: [],
      其他: []
    };

    newsList.forEach(news => {
      const category = news.category || '其他';
      if (categorizedNews[category]) {
        categorizedNews[category].push({
          id: news.id,
          title: news.title,
          summary: news.summary || news.description,
          time: news.publishedAt
        });
      }
    });

    return categorizedNews;
  }

  /**
   * 提取政策事件
   */
  async extractPolicyEvents(newsList) {
    return newsList
      .filter(news =>
        news.title?.includes('政策') ||
        news.title?.includes('改革') ||
        news.title?.includes('发布') ||
        news.title?.includes('批准') ||
        news.category === '时政' ||
        news.category === '财经'
      )
      .map(news => ({
        title: news.title,
        summary: news.summary || news.description,
        background: news.background,
        relatedEvents: news.relatedEvents || []
      }));
  }

  /**
   * 生成深度分析报告（使用真实市场数据）
   */
  async generateInDepthAnalysis(context) {
    const { currentNews, policyEvents, historicalMemory, realTimeData } = context;

    try {
      // 使用真实市场数据构建公告
      const bulletin = this.buildBulletinWithRealData({
        currentNews,
        policyEvents,
        historicalMemory,
        realTimeData
      });

      // 如果有AI服务，可以用AI增强分析
      try {
        const prompt = this.buildEnhancementPrompt({
          currentNews: currentNews.slice(0, 5),
          policyEvents,
          bulletin
        });

        const response = await aiService.chat(prompt, currentNews, [{
          role: 'system',
          content: this.persona
        }]);

        // 解析AI响应并合并到公告中
        return this.mergeAIAnalysis(bulletin, response.response);
      } catch (aiError) {
        console.log('AI增强失败，返回基础公告:', aiError.message);
        return bulletin;
      }
    } catch (error) {
      console.error('生成分析失败:', error.message);
      return this.generateFallbackBulletin(currentNews);
    }
  }

  /**
   * 使用真实数据构建公告
   */
  buildBulletinWithRealData({ currentNews, policyEvents, realTimeData }) {
    const { indices, sentiment, sectors } = realTimeData;

    // 获取上证指数
    const shIndex = indices.find(i => i.code === '000001' || i.name.includes('上证')) || indices[0];

    // 构建市场总览
    const marketOverview = this.buildMarketOverview(shIndex, sentiment, sectors);

    // 构建热点板块
    const hotSectors = this.buildHotSectors(sectors, currentNews);

    // 构建政策影响
    const policyImpact = this.buildPolicyImpact(policyEvents, sectors);

    // 构建风险提示
    const riskAlert = this.buildRiskAlert(sentiment, sectors);

    // 构建操作策略
    const operationStrategy = this.buildOperationStrategy(sentiment, shIndex);

    // 构建市场情绪
    const marketSentiment = {
      indexForecast: shIndex ? `${shIndex.name}当前点位${shIndex.price?.toFixed(2)}，${shIndex.changePercent >= 0 ? '上涨' : '下跌'}${Math.abs(shIndex.changePercent)?.toFixed(2)}%` : '指数震荡整理',
      sentiment: sentiment.sentiment || '中性',
      keyLevels: this.buildKeyLevels(shIndex)
    };

    return {
      marketOverview,
      hotSectors,
      policyImpact,
      riskAlert,
      operationStrategy,
      marketSentiment,
      learningNotes: `今日共分析${currentNews.length}条新闻，${indices.length}个指数，${sectors.length}个板块。市场${sentiment.sentiment}，情绪得分${sentiment.sentimentScore}。`,
      realTimeData: {
        indices: indices.slice(0, 5).map(i => ({
          name: i.name,
          price: i.price?.toFixed(2),
          change: i.changePercent?.toFixed(2) + '%'
        })),
        updateAt: new Date().toISOString()
      }
    };
  }

  /**
   * 构建市场总览
   */
  buildMarketOverview(index, sentiment, sectors) {
    const trend = index?.changePercent >= 0 ? '上涨' : '下跌';
    const topSector = sectors[0];

    return `今日A股市场${trend}${Math.abs(index?.changePercent || 0).toFixed(2)}%，${index?.name}报${index?.price?.toFixed(2)}点。市场情绪${sentiment.sentiment}，得分${sentiment.sentimentScore}分。

资金面方面，${sentiment.riseCount}只个股上涨，${sentiment.fallCount}只下跌。热点板块中，${topSector?.name}表现最佳，涨幅达${topSector?.changePercent?.toFixed(2)}%，值得重点关注。

总体来看，市场呈现结构性机会，建议关注政策受益板块和题材轮动机会。`;
  }

  /**
   * 构建热点板块
   */
  buildHotSectors(sectors, news) {
    return sectors.slice(0, 6).map(sector => {
      // 根据新闻匹配板块逻辑
      const logic = this.analyzeSectorLogic(sector, news);

      return {
        sector: sector.name,
        logic: logic || `${sector.name}板块今日表现${sector.changePercent >= 0 ? '强势' : '弱势'}，涨跌幅${sector.changePercent?.toFixed(2)}%`,
        strength: sector.strength || 'B',
        targetStocks: this.getRealStocksForSector(sector.name),
        entryPoint: this.getEntryPoint(sector),
        exitPoint: '冲高回落时获利了结',
        stopLoss: '跌破5日均线止损'
      };
    });
  }

  /**
   * 分析板块逻辑
   */
  analyzeSectorLogic(sector, news) {
    const relevantNews = news.filter(n =>
      n.title?.includes(sector.name) ||
      n.category?.includes(this.mapSectorToCategory(sector.name))
    );

    if (relevantNews.length > 0) {
      return `${relevantNews[0].title?.substring(0, 30)}...`;
    }

    return null;
  }

  /**
   * 映射板块到新闻分类
   */
  mapSectorToCategory(sectorName) {
    const mapping = {
      '人工智能': '科技',
      '半导体': '科技',
      '新能源': '科技',
      '医药': '财经',
      '金融': '财经'
    };
    return mapping[sectorName] || '综合';
  }

  /**
   * 获取板块对应真实股票
   */
  getRealStocksForSector(sectorName) {
    const stockMap = {
      '人工智能': ['海康威视', '科大讯飞', '金山办公'],
      '半导体': ['中芯国际', '北方华创', '韦尔股份'],
      '新能源': ['宁德时代', '比亚迪', '隆基绿能'],
      '医药': ['恒瑞医药', '爱尔眼科', '药明康德'],
      '消费': ['贵州茅台', '五粮液', '泸州老窖'],
      '金融': ['中国平安', '工商银行', '招商银行'],
      '地产': ['万科A', '保利发展'],
      '军工': ['中航沈飞', '航发动力']
    };

    return stockMap[sectorName] || ['相关龙头股'];
  }

  /**
   * 获取买入点
   */
  getEntryPoint(sector) {
    if (sector.changePercent > 2) {
      return '等待回调至5日均线附近介入';
    } else if (sector.changePercent > 0) {
      return '可轻仓试探，突破确认后加仓';
    } else {
      return '暂时观望，等待企稳信号';
    }
  }

  /**
   * 构建政策影响
   */
  buildPolicyImpact(policyEvents, sectors) {
    if (!policyEvents || policyEvents.length === 0) {
      return [];
    }

    return policyEvents.slice(0, 3).map(policy => ({
      policy: policy.title,
      impact: `${policy.summary}。该政策有望提振市场信心，相关板块有望受益。`,
      beneficiarySectors: this.getBeneficiarySectors(policy.title, sectors),
      relatedHistory: policy.relatedEvents?.[0] || '历史上类似政策曾多次引发板块轮动'
    }));
  }

  /**
   * 获取受益板块
   */
  getBeneficiarySectors(policyTitle, sectors) {
    const top3 = sectors.slice(0, 3).map(s => s.name);
    return top3;
  }

  /**
   * 构建风险提示
   */
  buildRiskAlert(sentiment, sectors) {
    const risks = [];

    if (sentiment.sentimentScore > 70) {
      risks.push('市场情绪过热，注意追高风险');
    } else if (sentiment.sentimentScore < 30) {
      risks.push('市场情绪低迷，注意控制仓位');
    }

    risks.push(`注意个股分化，精选标的`);
    risks.push('外围市场波动风险');
    risks.push('政策落地不及预期风险');

    return risks.slice(0, 4);
  }

  /**
   * 构建操作策略
   */
  buildOperationStrategy(sentiment, index) {
    let today, positionAdvice;

    if (sentiment.sentimentScore > 60) {
      today = '市场情绪较好，可适度参与，但不追高';
      positionAdvice = '5-7成仓位，灵活调整';
    } else if (sentiment.sentimentScore < 40) {
      today = '市场情绪较弱，以观望为主，等待企稳';
      positionAdvice = '3-5成仓位，防守为主';
    } else {
      today = '市场震荡，控制仓位，精选个股';
      positionAdvice = '4-6成仓位，波段操作';
    }

    return {
      today,
      shortTerm: '关注政策催化板块，波段操作',
      mediumTerm: '布局优质成长股，持有待涨',
      positionAdvice
    };
  }

  /**
   * 构建关键位置
   */
  buildKeyLevels(index) {
    if (!index) {
      return ['支撑位: 3200', '压力位: 3280'];
    }

    const price = index.price || 3200;
    const support = (price * 0.99).toFixed(0);
    const resistance = (price * 1.01).toFixed(0);

    return [
      `支撑位: ${support}`,
      `压力位: ${resistance}`
    ];
  }

  /**
   * 构建AI增强提示词
   */
  buildEnhancementPrompt({ currentNews, policyEvents, bulletin }) {
    const newsText = currentNews.map((n, i) =>
      `${i + 1}. ${n.title}`
    ).join('\n');

    return `基于以下真实市场数据，请用游资视角进行专业点评：

## 当前市场数据
- 市场总览: ${bulletin.marketOverview.substring(0, 100)}...
- 热点板块: ${bulletin.hotSectors.map(s => s.sector).join('、')}

## 新闻摘要
${newsText}

请提供简要的专业点评（100字以内），重点关注：
1. 市场机会和风险
2. 操作建议

返回格式：纯文本`;
  }

  /**
   * 合并AI分析
   */
  mergeAIAnalysis(bulletin, aiResponse) {
    // 将AI的见解添加到学习笔记
    bulletin.learningNotes += `\n\nAI专业点评: ${aiResponse}`;
    return bulletin;
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt({ currentNews, policyEvents, historicalContext }) {
    const newsText = currentNews.map((n, i) =>
      `${i + 1}. [${n.category || '综合'}] ${n.title}\n   ${n.summary || n.description?.substring(0, 100)}`
    ).join('\n\n');

    const policyText = policyEvents.map((p, i) =>
      `${i + 1}. ${p.title}\n   背景: ${p.background?.substring(0, 100)}\n   相关: ${p.relatedEvents?.join('、')}`
    ).join('\n\n');

    return `作为资深游资，请对今日市场进行深度分析：

## 今日新闻要点
${newsText}

## 重要政策事件
${policyText}

## 历史参考
${historicalContext}

请按以下结构输出（JSON格式）：
{
  "marketOverview": "市场总体走势概述（游资视角）",
  "hotSectors": [
    {
      "sector": "板块名称",
      "logic": "上涨逻辑（政策、事件、资金）",
      "strength": "强度评级（S/A/B/C）",
      "targetStocks": ["重点关注股票1", "股票2"],
      "entryPoint": "买入时机和位置",
      "exitPoint": "卖出策略",
      "stopLoss": "止损位置"
    }
  ],
  "policyImpact": [
    {
      "policy": "政策名称",
      "impact": "对市场的影响分析",
      "beneficiarySectors": ["受益板块"],
      "relatedHistory": "历史类似案例"
    }
  ],
  "riskAlert": [
    "风险提示1",
    "风险提示2"
  ],
  "operationStrategy": {
    "today": "今日操作策略",
    "shortTerm": "短期（1-3天）策略",
    "mediumTerm": "中期（1-2周）策略",
    "positionAdvice": "仓位建议"
  },
  "marketSentiment": {
    "indexForecast": "指数走势预判",
    "sentiment": "市场情绪（贪婪/恐惧/观望）",
    "keyLevels": ["关键支撑/阻力位"]
  },
  "learningNotes": "从今日分析中学到的要点（用于记忆）"
}

请确保：
1. 板块逻辑清晰，有政策或事件支撑
2. 给出具体股票名称（如：贵州茅台、宁德时代等）
3. 买卖时机明确，带有价格区间
4. 风险提示具体到位
5. 用游资的实战语言，有洞察力`;
  }

  /**
   * 总结历史记忆
   */
  summarizeHistoricalMemory(memory) {
    if (!memory || memory.length === 0) {
      return '暂无历史数据';
    }

    return memory.slice(0, 5).map((m, i) => {
      const date = new Date(m.date).toLocaleDateString('zh-CN');
      const hotSectors = m.analysis?.hotSectors?.map(s => s.sector).join('、') || '';
      return `${date}: 热点板块 - ${hotSectors}`;
    }).join('\n');
  }

  /**
   * 解析AI响应
   */
  parseBulletinResponse(response, newsList) {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...this.getDefaultBulletinStructure(),
          ...parsed,
          generatedAt: new Date().toISOString(),
          newsCount: newsList.length
        };
      }
    } catch (error) {
      console.error('解析响应失败:', error.message);
    }

    return this.generateFallbackBulletin(newsList);
  }

  /**
   * 生成备用公告（当AI不可用时）
   */
  generateFallbackBulletin(newsList) {
    const hotSectorsMap = {
      '财经': ['金融', '地产', '基建'],
      '科技': ['人工智能', '芯片半导体', '云计算'],
      '国际': ['外贸', '航运', '跨境支付'],
      '时政': ['国企改革', '政策受益板块']
    };

    const hotSectors = Object.entries(hotSectorsMap).flatMap(([category, sectors]) =>
      sectors.map(sector => ({
        sector,
        logic: `${category}领域政策利好，市场关注度提升`,
        strength: 'B',
        targetStocks: this.getRepresentativeStocks(sector),
        entryPoint: '回调至5日均线附近可考虑介入',
        exitPoint: '冲高回落时获利了结',
        stopLoss: '跌破10日均线止损'
      }))
    ).slice(0, 6);

    return {
      marketOverview: '今日市场受多重因素影响，呈现结构性机会。政策面持续发力，资金面相对充裕，建议关注政策受益板块和题材轮动机会。',
      hotSectors,
      policyImpact: newsList.slice(0, 3).map(news => ({
        policy: news.title,
        impact: '对相关板块产生积极影响，有望引发市场关注',
        beneficiarySectors: [news.category === '财经' ? '金融' : news.category === '科技' ? '科技' : '综合'],
        relatedHistory: news.relatedEvents?.[0] || '类似政策曾多次引发市场反应'
      })),
      riskAlert: [
        '市场分化加剧，注意个股选择',
        '外围市场波动风险',
        '政策落地不及预期风险',
        '获利盘回吐压力'
      ],
      operationStrategy: {
        today: '控制仓位，逢低布局，不追高',
        shortTerm: '关注政策催化板块，波段操作',
        mediumTerm: '布局优质成长股，持有待涨',
        positionAdvice: '建议5-7成仓位，灵活调整'
      },
      marketSentiment: {
        indexForecast: '震荡整理，结构性行情',
        sentiment: '观望偏乐观',
        keyLevels: ['支撑位：3200点', '压力位：3280点']
      },
      learningNotes: '今日分析基于当前新闻和政策环境，需持续跟踪市场变化验证判断',
      generatedAt: new Date().toISOString(),
      newsCount: newsList.length,
      isFallback: true
    };
  }

  /**
   * 获取代表性股票
   */
  getRepresentativeStocks(sector) {
    const stockMap = {
      '金融': ['工商银行', '招商银行', '中国平安'],
      '地产': ['万科A', '保利发展'],
      '基建': ['中国建筑', '中国中铁'],
      '人工智能': ['科大讯飞', '海康威视', '金山办公'],
      '芯片半导体': ['中芯国际', '北方华创', '韦尔股份'],
      '云计算': ['用友网络', '浪潮信息'],
      '外贸': ['中远海控', '中国外运'],
      '航运': ['中集集团', '招商轮船'],
      '跨境支付': ['拉卡拉', '新国都'],
      '国企改革': ['中国联通', '中国移动'],
      '政策受益板块': ['中国交建', '中国电建']
    };

    return stockMap[sector] || ['相关龙头股'];
  }

  /**
   * 获取默认公告结构
   */
  getDefaultBulletinStructure() {
    return {
      marketOverview: '',
      hotSectors: [],
      policyImpact: [],
      riskAlert: [],
      operationStrategy: {
        today: '',
        shortTerm: '',
        mediumTerm: '',
        positionAdvice: ''
      },
      marketSentiment: {
        indexForecast: '',
        sentiment: '',
        keyLevels: []
      },
      learningNotes: ''
    };
  }

  /**
   * 更新记忆库
   */
  async updateMemory(data) {
    try {
      const pool = await getPool();

      // 检查表是否存在
      await pool.query(`
        CREATE TABLE IF NOT EXISTS market_memory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          data JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // 插入新记忆
      await pool.query(
        'INSERT INTO market_memory (data) VALUES (?)',
        [JSON.stringify(data)]
      );

      // 清理旧数据（保留最近90天）
      await pool.query(`
        DELETE FROM market_memory
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `);

      console.log('记忆库已更新');
    } catch (error) {
      console.error('更新记忆失败:', error.message);
    }
  }

  /**
   * 获取学习进度
   */
  async getLearningProgress() {
    try {
      const pool = await getPool();
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM market_memory');

      return {
        totalMemories: rows[0].count,
        learningDays: rows[0].count,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      return {
        totalMemories: 0,
        learningDays: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }
}

module.exports = new MarketBulletinAgent();
