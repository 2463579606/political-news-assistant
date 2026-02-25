/**
 * Sector Mapper
 * 板块映射器
 *
 * 功能：
 * 1. 事件到板块的映射
 * 2. 板块到股票的映射
 * 3. 关键词匹配
 * 4. 智能推荐
 */

class SectorMapper {
  constructor() {
    // 板块关键词映射
    this.sectorKeywords = {
      // 金融板块
      '银行': ['银行', '央行', '利率', '存贷', 'LPR', '降准', '存款准备金'],
      '券商': ['券商', '证券', '期货', '期权', '基金', '资管'],
      '保险': ['保险', '寿险', '财险', '保费'],

      // 地产板块
      '房地产': ['房地产', '地产', '住房', '房价', '楼市', '棚改'],
      '建筑建材': ['建筑', '建材', '水泥', '钢铁', '玻璃', '装修'],

      // 科技板块
      '半导体': ['芯片', '半导体', '集成电路', '存储', '封装', '晶圆'],
      '软件': ['软件', 'APP', '应用', 'SaaS', '云计算', '大数据'],
      '互联网': ['互联网', '电商', '游戏', '社交', '搜索', '在线'],
      '通信': ['通信', '5G', '6G', '基站', '光纤', '通信设备'],

      // 新能源板块
      '光伏': ['光伏', '太阳能', '硅料', '硅片', '电池', '组件'],
      '风电': ['风电', '风力', '风机', '叶片', '塔筒', '海上风电'],
      '锂电池': ['锂电池', '锂电', '正极', '负极', '电解液', '隔膜'],
      '新能源车': ['新能源车', '电动汽车', 'EV', '充电桩', '动力电池'],

      // 消费板块
      '食品饮料': ['食品', '饮料', '白酒', '调味品', '乳制品', '猪肉'],
      '医药生物': ['医药', '生物', '疫苗', '创新药', '仿制药', '医疗器械'],
      '纺织服饰': ['纺织', '服装', '服饰', '鞋帽', '品牌'],
      '家电': ['家电', '空调', '冰箱', '洗衣机', '电视', '厨电'],

      // 资源板块
      '煤炭': ['煤炭', '煤矿', '动力煤', '焦煤'],
      '石油': ['石油', '原油', '石化', '天然气', '油气'],
      '有色金属': ['有色金属', '铜', '铝', '锌', '锂', '稀土'],
      '钢铁': ['钢铁', '铁矿', '钢材', '特钢'],

      // 制造业
      '机械': ['机械', '设备', '工程机械', '机床'],
      '汽车': ['汽车', '整车', '乘用车', '商用车', '零部件'],
      '军工': ['军工', '国防', '航天', '航空', '兵器'],

      // 交通运输
      '交通运输': ['交通', '运输', '物流', '港口', '机场', '航空'],
      '电力': ['电力', '电网', '发电', '供电', '新能源电力'],

      // 其他
      '农业': ['农业', '种业', '农药', '化肥', '养殖'],
      '环保': ['环保', '污水处理', '固废', '大气治理'],
      '化工': ['化工', '石化', '精细化工', '化纤']
    };

    // 板块-股票映射（示例数据）
    this.sectorStocks = {
      '银行': ['000001.SZ', '600000.SH', '601166.SH', '601398.SH', '601939.SH'],
      '券商': ['600030.SH', '601688.SH', '600837.SH', '000166.SZ'],
      '保险': ['601318.SH', '601601.SH', '000166.SZ'],
      '房地产': ['000002.SZ', '600048.SH', '001979.SZ'],
      '半导体': ['600584.SH', '002049.SZ', '688981.SH'],
      '软件': ['300033.SZ', '002410.SZ', '600588.SH'],
      '白酒': ['600519.SH', '000858.SZ', '002304.SZ'],
      '新能源车': ['002594.SZ', '300750.SZ', '688111.SH'],
      '光伏': ['600438.SH', '601012.SH', '300274.SZ'],
      '锂电池': ['300014.SZ', '002466.SZ', '300124.SZ']
    };
  }

  /**
   * 将事件映射到相关板块
   * @param {Object} event - 事件对象
   */
  async mapEventToSectors(event) {
    const text = `${event.title} ${event.description}`.toLowerCase();

    // 计算每个板块的相关性得分
    const sectorScores = [];

    for (const [sector, keywords] of Object.entries(this.sectorKeywords)) {
      let score = 0;
      const matchedKeywords = [];

      for (const keyword of keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        sectorScores.push({
          sector: sector,
          score: score,
          matchedKeywords: matchedKeywords
        });
      }
    }

    // 按得分排序，返回前5个
    sectorScores.sort((a, b) => b.score - a.score);
    const topSectors = sectorScores.slice(0, 5);

    return topSectors.map(s => s.sector);
  }

  /**
   * 获取板块下的股票
   * @param {string} sectorCode - 板块代码
   */
  async getStocksInSector(sectorCode) {
    return this.sectorStocks[sectorCode] || [];
  }

  /**
   * 智能推荐受影响的股票
   * @param {Object} event - 事件对象
   * @param {number} limit - 返回数量限制
   */
  async recommendStocks(event, limit = 10) {
    try {
      // 1. 先映射到板块
      const sectors = await this.mapEventToSectors(event);

      if (sectors.length === 0) {
        // 如果没有匹配到板块，返回空数组
        return {
          sectors: [],
          stocks: [],
          confidence: 0
        };
      }

      // 2. 获取这些板块的股票
      const stockMap = new Map();
      const stockScores = new Map();

      for (const sector of sectors) {
        const stocks = await this.getStocksInSector(sector);

        for (const stock of stocks) {
          // 如果股票已存在，增加权重
          if (stockMap.has(stock)) {
            stockScores.set(stock, stockScores.get(stock) + 1);
          } else {
            stockMap.set(stock, sector);
            stockScores.set(stock, 1);
          }
        }
      }

      // 3. 按权重排序
      const sortedStocks = Array.from(stockScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([stock, score]) => ({
          code: stock,
          sector: stockMap.get(stock),
          relevanceScore: score
        }));

      return {
        sectors: sectors,
        stocks: sortedStocks,
        confidence: Math.min(1.0, sectors.length * 0.3)
      };

    } catch (error) {
      console.error('推荐股票失败:', error.message);
      return {
        sectors: [],
        stocks: [],
        confidence: 0
      };
    }
  }

  /**
   * 从关键词快速匹配板块
   * @param {string} keyword - 关键词
   */
  quickMatch(keyword) {
    const lowerKeyword = keyword.toLowerCase();

    const matches = [];
    for (const [sector, keywords] of Object.entries(this.sectorKeywords)) {
      if (keywords.some(kw => lowerKeyword.includes(kw) || kw.includes(lowerKeyword))) {
        matches.push(sector);
      }
    }

    return matches;
  }

  /**
   * 获取所有板块列表
   */
  getAllSectors() {
    return Object.keys(this.sectorKeywords);
  }

  /**
   * 添加自定义板块映射
   * @param {string} sector - 板块名称
   * @param {Array} keywords - 关键词数组
   * @param {Array} stocks - 股票数组（可选）
   */
  addCustomSector(sector, keywords, stocks = []) {
    this.sectorKeywords[sector] = keywords;
    if (stocks.length > 0) {
      this.sectorStocks[sector] = stocks;
    }
  }

  /**
   * 分析板块热度
   * @param {Array} events - 事件数组
   */
  analyzeSectorHeat(events) {
    const sectorCounts = {};

    for (const event of events) {
      const sectors = event.impactSectors || [];
      for (const sector of sectors) {
        if (sectorCounts[sector]) {
          sectorCounts[sector] += event.importanceScore;
        } else {
          sectorCounts[sector] = event.importanceScore;
        }
      }
    }

    // 转换为数组并排序
    const sortedSectors = Object.entries(sectorCounts)
      .map(([sector, score]) => ({ sector, score: parseFloat(score.toFixed(2)) }))
      .sort((a, b) => b.score - a.score);

    return sortedSectors;
  }
}

module.exports = SectorMapper;
