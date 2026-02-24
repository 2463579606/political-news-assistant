const { Pool } = require('pg');

/**
 * AI学习服务 - 核心功能
 * 负责将新闻和行情数据进行学习、关联分析和记忆存储
 */
class AILearningService {
  constructor() {
    // 数据库连接池
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'political_news',
      user: process.env.DB_USER || 'political_news_user',
      password: process.env.DB_PASSWORD || 'political_news_pass',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    console.log('[AI学习] 服务初始化完成');
  }

  /**
   * 每日新闻学习
   * 将新闻数据提取为事件并存储到event_memory表
   */
  async learnFromNews(newsData) {
    console.log('[AI学习] 开始学习新闻，数量:', newsData.length);

    let eventsExtracted = 0;

    for (const news of newsData) {
      try {
        // 提取事件特征
        const event = this.extractEvent(news);

        // 存储到数据库
        await this.saveEvent(event);
        eventsExtracted++;

        console.log(`[AI学习] 提取事件: ${event.event_title.substring(0, 30)}...`);
      } catch (e) {
        console.error('[AI学习] 事件提取失败:', e.message);
      }
    }

    console.log(`[AI学习] 新闻学习完成，提取事件: ${eventsExtracted}/${newsData.length}`);

    // 更新学习日志
    await this.updateLearningLog({ news_learned: newsData.length, events_extracted: eventsExtracted });

    return eventsExtracted;
  }

  /**
   * 公告学习
   * 将股市公告提取为事件并存储到event_memory表
   */
  async learnFromBulletins(bulletins) {
    console.log('[AI学习] 开始学习公告，数量:', bulletins.length);

    let eventsExtracted = 0;

    for (const bulletin of bulletins) {
      try {
        // 提取事件特征
        const event = this.extractBulletinEvent(bulletin);

        // 存储到数据库
        await this.saveEvent(event);
        eventsExtracted++;

        console.log(`[AI学习] 提取公告事件: ${event.event_title.substring(0, 30)}...`);
      } catch (e) {
        console.error('[AI学习] 公告事件提取失败:', e.message);
      }
    }

    console.log(`[AI学习] 公告学习完成，提取事件: ${eventsExtracted}/${bulletins.length}`);

    // 更新学习日志
    await this.updateLearningLog({ news_learned: 0, events_extracted: eventsExtracted });

    return eventsExtracted;
  }

  /**
   * 从新闻中提取事件
   */
  extractEvent(news) {
    // 简单的事件提取逻辑（后续可以用AI增强）
    const eventType = this.detectEventType(news);
    const importance = this.calculateImportance(news);
    const sentiment = this.analyzeSentiment(news);
    const keywords = this.extractKeywords(news);
    const stockCodes = this.extractStockCodes(news);

    return {
      event_date: new Date().toISOString().split('T')[0],
      event_type: eventType,
      event_title: news.title,
      event_content: news.description || news.content || '',
      importance: importance,
      sentiment: sentiment,
      related_stocks: stockCodes,  // 使用新的股票代码识别功能
      related_sectors: this.detectSectors(news),
      keywords: keywords,
      source_name: news.sourceName || '未知',
      source_url: news.url || '#',
    };
  }

  /**
   * 从公告中提取事件
   */
  extractBulletinEvent(bulletin) {
    const bulletinType = bulletin.type.cn;
    const importance = bulletin.importance || 3;
    const sentiment = this.analyzeBulletinSentiment(bulletin);

    // 提取股票代码
    const relatedStocks = [bulletin.stockCode];

    // 提取行业（如果有）
    const relatedSectors = bulletin.industries || [];

    // 生成更详细的事件内容
    const eventContent = this.generateBulletinContent(bulletin);

    return {
      event_date: new Date(bulletin.publishTime).toISOString().split('T')[0],
      event_type: `股市公告-${bulletinType}`,
      event_title: bulletin.title,
      event_content: eventContent,
      importance: importance,
      sentiment: sentiment,
      related_stocks: relatedStocks,
      related_sectors: relatedSectors,
      keywords: bulletin.keywords || [bulletinType],
      source_name: bulletin.source || '巨潮资讯',
      source_url: bulletin.url || '#',
    };
  }

  /**
   * 分析公告情感倾向
   */
  analyzeBulletinSentiment(bulletin) {
    const title = (bulletin.title || '').toLowerCase();
    const type = bulletin.type.cn || '';

    // 正面公告类型
    const positiveTypes = ['分红', '转增', '回购', '增持', '业绩预告', '业绩快报', '中标', '合同'];
    // 负面公告类型
    const negativeTypes = ['停牌', '减持', '质押', '诉讼', '处罚', '退市', '风险', '亏损'];

    // 正面关键词
    const positiveWords = ['增长', '提升', '改善', '突破', '利好', '盈利', '净利', '营收'];
    // 负面关键词
    const negativeWords = ['下降', '下跌', '亏损', '下滑', '风险', '违规', '处罚', '退市'];

    // 先按类型判断
    if (positiveTypes.some(t => type.includes(t))) {
      return 1;
    }
    if (negativeTypes.some(t => type.includes(t))) {
      return -1;
    }

    // 按关键词判断
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (title.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (title.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return 1;
    if (negativeCount > positiveCount) return -1;
    return 0;
  }

  /**
   * 生成公告事件详细内容
   */
  generateBulletinContent(bulletin) {
    let content = bulletin.summary || bulletin.title;

    // 添加补充信息
    if (bulletin.type.cn) {
      content += `\n公告类型：${bulletin.type.cn}`;
    }

    if (bulletin.stockName && bulletin.stockCode) {
      content += `\n股票：${bulletin.stockName}（${bulletin.stockCode}）`;
    }

    if (bulletin.publishTime) {
      const publishDate = new Date(bulletin.publishTime).toLocaleString('zh-CN');
      content += `\n发布时间：${publishDate}`;
    }

    if (bulletin.industries && bulletin.industries.length > 0) {
      content += `\n所属行业：${bulletin.industries.join('、')}`;
    }

    return content;
  }

  /**
   * 检测事件类型
   */
  detectEventType(news) {
    const title = (news.title || '').toLowerCase();
    const content = (news.content || '').toLowerCase();

    // 政策类型关键词
    if (title.includes('政策') || title.includes('发布') || title.includes('通知') ||
        content.includes('政策') || content.includes('规定')) {
      return '政策发布';
    }

    // 会议类型
    if (title.includes('会议') || title.includes('峰会') || title.includes('论坛') ||
        content.includes('召开') || content.includes('会议')) {
      return '会议';
    }

    // 数据类型
    if (title.includes('数据') || title.includes('统计') || title.includes('报告') ||
        content.includes('GDP') || content.includes('CPI') || content.includes('PMI')) {
      return '宏观数据';
    }

    // 突发事件
    if (title.includes('突发') || title.includes('紧急') || title.includes('事故') ||
        content.includes('突发') || content.includes('紧急')) {
      return '突发事件';
    }

    // 默认为一般新闻
    return '一般新闻';
  }

  /**
   * 计算重要性 (1-5)
   */
  calculateImportance(news) {
    let score = 3;  // 默认中等

    const title = (news.title || '').toLowerCase();
    const source = (news.sourceName || '').toLowerCase();

    // 根据来源加分
    if (source.includes('新华社') || source.includes('人民日报') || source.includes('央视')) {
      score += 1;
    }

    // 根据关键词加分
    if (title.includes('重大') || title.includes('重要') || title.includes('紧急')) {
      score += 1;
    }

    if (title.includes('政策') || title.includes('发布')) {
      score += 0.5;
    }

    // 限制在1-5范围
    return Math.min(5, Math.max(1, Math.round(score)));
  }

  /**
   * 分析情感倾向 (-1负面, 0中性, 1正面)
   * 增强版：使用权重和上下文分析
   */
  analyzeSentiment(news) {
    const title = (news.title || '');
    const content = (news.content || '');
    const fullText = (title + ' ' + content).toLowerCase();

    // 强正面词（权重2）
    const strongPositive = [
      '大涨', '暴涨', '飙升', '重大突破', '历史新高', '强劲增长',
      '超预期', '大幅增长', '显著改善', '持续向好', '稳步提升'
    ];

    // 正面词（权重1）
    const positiveWords = [
      '增长', '上涨', '利好', '推动', '促进', '提升', '改善', '突破',
      '上涨', '回升', '扩张', '盈利', '净利', '营收', '红利', '分红',
      '增持', '回购', '中标', '获批', '成功', '优化', '创新', '发展'
    ];

    // 强负面词（权重2）
    const strongNegative = [
      '暴跌', '大跌', '崩盘', '危机', '衰退', '大幅下滑', '严重恶化',
      '重大亏损', '退市', '违规', '处罚', '调查', '诉讼', '风险'
    ];

    // 负面词（权重1）
    const negativeWords = [
      '下降', '下跌', '利空', '打压', '抑制', '恶化', '下滑', '下跌',
      '亏损', '下降', '缩减', '减持', '质押', '警告', '压力', '挑战'
    ];

    // 中性词（权重-0.5，表示影响判断）
    const neutralWords = [
      '发布', '公告', '通知', '声明', '报告', '会议', '讨论', '审议',
      '通过', '签订', '签署', '完成', '结束', '召开', '举行'
    ];

    let score = 0;

    // 计算强正面词
    strongPositive.forEach(word => {
      const count = (fullText.match(new RegExp(word, 'g')) || []).length;
      score += count * 2;
    });

    // 计算正面词
    positiveWords.forEach(word => {
      const count = (fullText.match(new RegExp(word, 'g')) || []).length;
      score += count * 1;
    });

    // 计算强负面词
    strongNegative.forEach(word => {
      const count = (fullText.match(new RegExp(word, 'g')) || []).length;
      score -= count * 2;
    });

    // 计算负面词
    negativeWords.forEach(word => {
      const count = (fullText.match(new RegExp(word, 'g')) || []).length;
      score -= count * 1;
    });

    // 调整：如果有中性词，略微降低极性
    let hasNeutral = false;
    neutralWords.forEach(word => {
      if (fullText.includes(word)) {
        hasNeutral = true;
      }
    });

    // 标题权重更高（乘以1.5）
    const titleLower = title.toLowerCase();
    strongPositive.forEach(word => {
      if (titleLower.includes(word)) score += 1;
    });
    strongNegative.forEach(word => {
      if (titleLower.includes(word)) score -= 1;
    });

    // 根据得分判断情感
    if (score >= 3) return 1;  // 明显正面
    if (score <= -3) return -1;  // 明显负面

    // 中等得分时考虑是否有中性词
    if (hasNeutral && Math.abs(score) <= 2) {
      return 0;  // 有中性词且得分不高，判定为中性
    }

    if (score > 0) return 1;
    if (score < 0) return -1;
    return 0;
  }

  /**
   * 提取关键词 - 增强版
   * 包含实体识别和主题提取
   */
  extractKeywords(news) {
    const title = (news.title || '');
    const content = (news.content || '');
    const text = title + ' ' + content;
    const keywords = new Set();  // 使用Set去重

    // 1. 政府机构实体
    const governmentEntities = [
      '国务院', '发改委', '央行', '人民银行', '财政部', '证监会',
      '银保监会', '工信部', '商务部', '外交部', '教育部',
      '卫健委', '科技部', '生态环境部', '住建部', '交通运输部',
      '人大常委会', '政协', '最高人民法院', '最高人民检察院'
    ];

    // 2. 政策关键词
    const policyKeywords = [
      '政策', '改革', '规划', '方案', '意见', '通知', '办法',
      '条例', '规定', '决定', '措施', '指导意见',
      '降息', '降准', '加息', '宽松', '紧缩',
      'GDP', 'CPI', 'PMI', 'PPI', 'M2'
    ];

    // 3. 经济关键词
    const economicKeywords = [
      '经济增长', '通胀', '通缩', '就业', '失业率',
      '消费', '投资', '出口', '进口', '贸易',
      '外汇', '汇率', '利率', '股市', 'A股', '港股', '美股',
      '新三板', '科创板', '创业板', '北交所'
    ];

    // 4. 产业关键词
    const industryKeywords = [
      '新能源', '光伏', '风电', '储能', '电池',
      '人工智能', 'AI', '芯片', '半导体', '集成电路',
      '5G', '6G', '通信', '大数据', '云计算', '区块链',
      '生物医药', '疫苗', '创新药', '医疗器械',
      '高端制造', '智能制造', '工业互联网',
      '新材料', '航空航天', '军工'
    ];

    // 5. 金融关键词
    const financeKeywords = [
      '银行', '保险', '证券', '基金', '信托', '租赁',
      'IPO', '上市', '退市', '重组', '并购', 'M&A',
      '分红', '转增', '回购', '增持', '减持',
      '质押', '平仓', '商誉减值'
    ];

    // 6. 房地产关键词
    const realEstateKeywords = [
      '房地产', '地产', '住房', '房价', '楼市',
      '房贷', '公积金', '保障房', '廉租房',
      '棚改', '旧改', '土地拍卖'
    ];

    // 7. 时间关键词
    const timePatterns = text.match(/20[1-3]\d{1}/g) || [];
    timePatterns.forEach(match => keywords.add(match));

    const quarterPatterns = text.match(/第[一二三四]季度/g) || [];
    quarterPatterns.forEach(match => keywords.add(match));

    // 遍历所有关键词类型
    const allKeywordLists = [
      governmentEntities,
      policyKeywords,
      economicKeywords,
      industryKeywords,
      financeKeywords,
      realEstateKeywords
    ];

    allKeywordLists.forEach(keywordList => {
      keywordList.forEach(keyword => {
        if (text.includes(keyword)) {
          keywords.add(keyword);
        }
      });
    });

    // 如果没有提取到关键词，使用默认关键词
    if (keywords.size === 0) {
      return ['时政要闻'];
    }

    // 转换为数组并限制数量（最多10个）
    return Array.from(keywords).slice(0, 10);
  }

  /**
   * 识别股票代码 - 增强版
   * 从新闻文本中识别A股股票代码
   */
  extractStockCodes(news) {
    const title = (news.title || '');
    const content = (news.content || '');
    const text = title + ' ' + content;

    const stockCodes = new Set();

    // 1. 直接匹配6位股票代码
    // 主板：600xxx, 601xxx, 603xxx, 605xxx
    // 深市主板：000xxx, 001xxx
    // 中小板：002xxx
    // 创业板：300xxx, 301xxx
    // 科创板：688xxx
    // 北交所：832xxx, 870xxx, 873xxx, 83xxxx, 87xxxx

    const patterns = [
      /(?:^|[^0-9])(600\d{3})(?![0-9])/g,  // 主板
      /(?:^|[^0-9])(601\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(603\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(605\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(000\d{3})(?![0-9])/g,  // 深市主板
      /(?:^|[^0-9])(001\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(002\d{3})(?![0-9])/g,  // 中小板
      /(?:^|[^0-9])(300\d{3})(?![0-9])/g,  // 创业板
      /(?:^|[^0-9])(301\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(688\d{3})(?![0-9])/g,  // 科创板
      /(?:^|[^0-9])(832\d{3})(?![0-9])/g,  // 北交所
      /(?:^|[^0-9])(870\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(873\d{3})(?![0-9])/g,
      /(?:^|[^0-9])(83\d{4})(?![0-9])/g,
      /(?:^|[^0-9])(87\d{4})(?![0-9])/g
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(code => {
          // 清理可能的前缀字符
          const cleanCode = code.replace(/^[^0-9]/, '');
          stockCodes.add(cleanCode);
        });
      }
    });

    // 2. 识别知名公司名称并映射到股票代码
    const famousCompanies = {
      '贵州茅台': '600519', '茅台': '600519',
      '五粮液': '000858',
      '宁德时代': '300750', '宁德': '300750',
      '比亚迪': '002594',
      '中国平安': '601318', '平安': '601318',
      '招商银行': '600036', '招行': '600036',
      '平安银行': '000001',
      '工商银行': '601398', '工行': '601398',
      '建设银行': '601939', '建行': '601939',
      '农业银行': '601288', '农行': '601288',
      '中国银行': '601988', '中行': '601988',
      '隆基绿能': '601012', '隆基': '601012',
      '美的集团': '000333', '美的': '000333',
      '格力电器': '000651', '格力': '000651',
      '海尔智家': '600690', '海尔': '600690',
      '海康威视': '002415',
      '立讯精密': '002475',
      '药明康德': '603259',
      '恒瑞医药': '600276',
      '长春高新': '000661',
      '中信证券': '600030',
      '东方财富': '300059',
      '同花顺': '300033',
      '中国石油': '601857',
      '中国石化': '600028',
      '中国移动': '600941',
      '中国联通': '600050',
      '中国电信': '601728'
    };

    Object.entries(famousCompanies).forEach(([companyName, code]) => {
      if (text.includes(companyName)) {
        stockCodes.add(code);
      }
    });

    // 转换为数组
    return Array.from(stockCodes);
  }

  /**
   * 检测相关板块 - 增强版
   */
  detectSectors(news) {
    const text = (news.title + ' ' + (news.content || '')).toLowerCase();
    const sectors = [];

    // 板块映射
    const sectorMap = {
      '新能源': ['新能源', '光伏', '风电', '电池', '储能'],
      '人工智能': ['人工智能', 'AI', '算法', '算力'],
      '芯片': ['芯片', '半导体', '集成电路'],
      '医药': ['医药', '生物', '疫苗', '制药'],
      '消费': ['消费', '零售', '电商', '白酒'],
      '金融': ['银行', '保险', '证券', '金融'],
      '房地产': ['房地产', '地产', '住房'],
      '军工': ['军工', '国防', '航天'],
    };

    Object.entries(sectorMap).forEach(([sector, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) {
        sectors.push(sector);
      }
    });

    return sectors.length > 0 ? sectors : ['综合'];
  }

  /**
   * 保存事件到数据库
   */
  async saveEvent(event) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO event_memory (
          event_date, event_type, event_title, event_content,
          importance, sentiment, related_stocks, related_sectors,
          keywords, source_name, source_url
        ) VALUES ($1::date, $2::varchar, $3::text, $4::text,
                  $5::int, $6::int, $7::text[], $8::text[],
                  $9::text[], $10::varchar, $11::text)
        RETURNING id
      `;

      const values = [
        event.event_date,
        event.event_type,
        event.event_title,
        event.event_content || '',
        event.importance,
        event.sentiment,
        event.related_stocks || [],
        event.related_sectors || [],
        event.keywords || [],
        event.source_name || '',
        event.source_url || '',
      ];

      const result = await client.query(query, values);
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * 记录市场数据
   */
  async recordMarketData(marketData) {
    console.log('[AI学习] 记录市场数据');

    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO market_memory (
          trade_date, index_change, market_mood, north_money,
          hot_sectors, cold_sectors, up_count, down_count, summary
        ) VALUES ($1, $2::numeric[], $3, $4, $5::text[], $6::text[], $7, $8, $9)
        ON CONFLICT (trade_date) DO UPDATE SET
          index_change = EXCLUDED.index_change,
          market_mood = EXCLUDED.market_mood,
          north_money = EXCLUDED.north_money,
          hot_sectors = EXCLUDED.hot_sectors,
          cold_sectors = EXCLUDED.cold_sectors,
          up_count = EXCLUDED.up_count,
          down_count = EXCLUDED.down_count,
          summary = EXCLUDED.summary
        RETURNING id
      `;

      const values = [
        marketData.trade_date || new Date().toISOString().split('T')[0],
        marketData.index_change || [],
        marketData.market_mood || '震荡',
        marketData.north_money || 0,
        marketData.hot_sectors || [],
        marketData.cold_sectors || [],
        marketData.up_count || 0,
        marketData.down_count || 0,
        marketData.summary || '市场正常波动',
      ];

      const result = await client.query(query, values);
      console.log('[AI学习] 市场数据记录成功，ID:', result.rows[0].id);

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * 分析新闻-市场关联
   */
  async analyzeCorrelation(eventDate) {
    console.log('[AI学习] 开始分析新闻-市场关联，日期:', eventDate);

    // 获取当日事件
    const events = await this.getEventsByDate(eventDate);
    console.log('[AI学习] 找到事件:', events.length);

    // 获取当日市场数据
    const marketData = await this.getMarketDataByDate(eventDate);
    if (!marketData) {
      console.log('[AI学习] 未找到市场数据');
      return 0;
    }

    let correlationsFound = 0;

    // 简化的关联分析逻辑
    for (const event of events) {
      // 如果事件的板块与市场热门板块有交集，认为是相关
      const affectedSectors = event.related_sectors.filter(s =>
        marketData.hot_sectors.includes(s)
      );

      if (affectedSectors.length > 0) {
        // 计算关联度（简化版）
        const correlationScore = 0.7;  // 基础关联度
        const impactDirection = event.sentiment;  // 用情感倾向作为影响方向
        const impactStrength = event.importance;  // 重要性作为影响力度

        // 保存关联分析结果
        await this.saveCorrelation({
          event_id: event.id,
          market_id: marketData.id,
          correlation_score: correlationScore,
          impact_direction: impactDirection,
          impact_strength: impactStrength,
          affected_sectors: affectedSectors,
          analysis_text: `事件"${event.event_title}"影响了板块: ${affectedSectors.join(', ')}`,
        });

        correlationsFound++;
        console.log(`[AI学习] 发现关联: ${event.event_title.substring(0, 30)}... -> ${affectedSectors.join(', ')}`);
      }
    }

    console.log(`[AI学习] 关联分析完成，发现关联: ${correlationsFound}`);

    // 更新学习日志
    await this.updateLearningLog({ correlations_found: correlationsFound });

    return correlationsFound;
  }

  /**
   * 获取指定日期的事件
   */
  async getEventsByDate(date) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM event_memory WHERE event_date = $1 ORDER BY importance DESC';
      const result = await client.query(query, [date]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * 获取指定日期的市场数据
   */
  async getMarketDataByDate(date) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM market_memory WHERE trade_date = $1';
      const result = await client.query(query, [date]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * 保存关联分析结果
   */
  async saveCorrelation(correlation) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO news_market_correlation (
          event_id, market_id, correlation_score, impact_direction,
          impact_strength, affected_sectors, analysis_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [
        correlation.event_id,
        correlation.market_id,
        correlation.correlation_score,
        correlation.impact_direction,
        correlation.impact_strength,
        correlation.affected_sectors,
        correlation.analysis_text,
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  /**
   * 更新学习日志
   */
  async updateLearningLog(updates) {
    const client = await this.pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];

      // 构建UPDATE动态部分 - 使用明确的类型
      const setParts = [];
      const values = [];

      if (updates.news_learned !== undefined) {
        setParts.push(`news_learned = ${parseInt(updates.news_learned)}`);
      }
      if (updates.events_extracted !== undefined) {
        setParts.push(`events_extracted = ${parseInt(updates.events_extracted)}`);
      }
      if (updates.correlations_found !== undefined) {
        setParts.push(`correlations_found = ${parseInt(updates.correlations_found)}`);
      }
      if (updates.accuracy_score !== undefined) {
        setParts.push(`accuracy_score = ${parseFloat(updates.accuracy_score)}`);
      }
      if (updates.model_version !== undefined) {
        setParts.push(`model_version = '${updates.model_version}'`);
      }
      if (updates.notes !== undefined) {
        setParts.push(`notes = '${updates.notes.replace(/'/g, "''")}'`);
      }

      if (setParts.length === 0) return;

      const query = `
        UPDATE learning_log
        SET ${setParts.join(', ')}
        WHERE log_date = '${today}'
      `;

      console.log('[AI学习] UPDATE query:', query);
      await client.query(query);
      console.log('[AI学习] 学习日志已更新');
    } finally {
      client.release();
    }
  }

  /**
   * 获取学习统计
   */
  async getLearningStats(days = 30) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT
          log_date,
          news_learned,
          events_extracted,
          correlations_found,
          accuracy_score
        FROM learning_log
        WHERE log_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY log_date DESC
      `;

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * 获取今日学习摘要
   */
  async getTodaySummary() {
    const client = await this.pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];

      const query = `
        SELECT * FROM learning_log WHERE log_date = $1
      `;

      const result = await client.query(query, [today]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }
}

module.exports = new AILearningService();
