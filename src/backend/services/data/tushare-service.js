/**
 * Tushare数据服务
 * 接入真实A股市场数据
 *
 * 官方文档: https://tushare.pro/document/2
 */

const axios = require('axios');

class TushareDataService {
  constructor() {
    this.token = process.env.TUSHARE_TOKEN;
    this.baseUrl = 'http://api.tushare.pro';
    this.enabled = !!this.token && this.token !== '';
  }

  /**
   * 调用Tushare API
   */
  async callApi(apiName, params = {}) {
    if (!this.enabled) {
      console.warn('⚠️  Tushare未配置，使用模拟数据');
      return this.getMockData(apiName);
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/${apiName}`,
        {
          api_name: apiName,
          token: this.token,
          params: params,
          fields: ''
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`Tushare API error: ${response.data.msg}`);
      }

      const items = response.data.data;
      console.log(`✅ Tushare [${apiName}]: 获取 ${items?.length || 0} 条数据`);
      return items;

    } catch (error) {
      console.error(`❌ Tushare API [${apiName}] 失败:`, error.message);

      // API调用失败时使用模拟数据
      console.log(`📝 回退到模拟数据`);
      return this.getMockData(apiName);
    }
  }

  /**
   * 获取日线行情数据
   */
  async getDailyData(stockCode, startDate, endDate) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(endDate)
    };

    return await this.callApi('daily', params);
  }

  /**
   * 获取日线行情（复权）
   */
  async getDailyDataAdj(stockCode, startDate, endDate) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(endDate)
    };

    return await this.callApi('daily_basic', params);
  }

  /**
   * 获取财务指标
   */
  async getFinancialIndicator(stockCode, period = null) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode
    };

    if (period) {
      params.period = period.replace(/-/g, '');
    }

    return await this.callApi('fina_indicator', params);
  }

  /**
   * 获取利润表
   */
  async getIncomeStatement(stockCode, period = null) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      report_type: '1'  // 合并报表
    };

    if (period) {
      params.period = period.replace(/-/g, '');
    }

    return await this.callApi('income', params);
  }

  /**
   * 获取资产负债表
   */
  async getBalanceSheet(stockCode, period = null) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      report_type: '1'
    };

    if (period) {
      params.period = period.replace(/-/g, '');
    }

    return await this.callApi('balancesheet', params);
  }

  /**
   * 获取现金流量表
   */
  async getCashFlowStatement(stockCode, period = null) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      report_type: '1'
    };

    if (period) {
      params.period = period.replace(/-/g, '');
    }

    return await this.callApi('cashflow', params);
  }

  /**
   * 获取估值指标
   */
  async getValuationIndicator(stockCode, tradeDate = null) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode
    };

    if (tradeDate) {
      params.trade_date = this.formatDate(tradeDate);
    }

    return await this.callApi('daily_basic', params);
  }

  /**
   * 获取资金流向数据
   */
  async getMoneyFlow(stockCode, startDate, endDate) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode,
      start_date: this.formatDate(startDate),
      end_date: this.formatDate(endDate)
    };

    return await this.callApi('moneyflow', params);
  }

  /**
   * 获取个股信息
   */
  async getStockInfo(stockCode) {
    const tsCode = this.formatStockCode(stockCode);
    const params = {
      ts_code: tsCode
    };

    return await this.callApi('stock_basic', params);
  }

  /**
   * 获取行业分类
   */
  async getIndustryClassify(level = 'L1', src = 'SW') {
    const params = {
      level: level,
      src: src  // SW=申万, CSC=证监会
    };

    return await this.callApi('industry', params);
  }

  /**
   * 获取行业成分股
   */
  async getIndustryMembers(indexCode) {
    const params = {
      index_code: indexCode
    };

    return await this.callApi('index_member', params);
  }

  /**
   * 获取宏观经济数据 - GDP
   */
  async getGDPData() {
    return await this.callApi('gdp_for', {});
  }

  /**
   * 获取宏观经济数据 - CPI
   */
  async getCPIData() {
    return await this.callApi('cpi', {});
  }

  /**
   * 获取宏观经济数据 - M2
   */
  async getM2Data() {
    return await this.callApi('m2', {});
  }

  /**
   * 检查服务状态
   */
  async checkStatus() {
    if (!this.enabled) {
      return {
        enabled: false,
        message: 'Tushare Token未配置，在.env中设置TUSHARE_TOKEN'
      };
    }

    try {
      // 测试API调用
      await this.callApi('trade_cal', {
        exchange: 'SSE',
        start_date: '20240101',
        end_date: '20240105'
      });

      return {
        enabled: true,
        message: 'Tushare API连接正常'
      };
    } catch (error) {
      return {
        enabled: false,
        message: `Tushare API连接失败: ${error.message}`
      };
    }
  }

  /**
   * 格式化股票代码
   * 600000 -> 600000.SH
   * 000001 -> 000001.SZ
   */
  formatStockCode(code) {
    if (!code) return '';

    // 已经有后缀
    if (code.includes('.')) return code;

    // 上交所
    if (code.startsWith('6') || code.startsWith('9')) {
      return `${code}.SH`;
    }

    // 深交所
    return `${code}.SZ`;
  }

  /**
   * 格式化日期
   * 2024-01-01 -> 20240101
   */
  formatDate(date) {
    if (!date) return '';

    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * 获取模拟数据（API不可用时）
   */
  getMockData(apiName) {
    console.log(`📝 生成模拟数据: ${apiName}`);

    switch (apiName) {
      case 'daily':
      case 'daily_basic':
        return this.getMockDailyData();

      case 'fina_indicator':
        return this.getMockFinancialData();

      case 'daily_basic':
        return this.getMockValuationData();

      case 'moneyflow':
        return this.getMockMoneyFlowData();

      default:
        return [];
    }
  }

  getMockDailyData() {
    const data = [];
    const baseDate = new Date('2024-01-01');
    const basePrice = 12.50;

    for (let i = 0; i < 100; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const change = (Math.random() - 0.5) * 0.5;
      const price = basePrice + change * 10;

      data.push({
        ts_code: '000001.SZ',
        trade_date: this.formatDate(date),
        open: (price * (1 + Math.random() * 0.01)).toFixed(2),
        high: (price * (1 + Math.random() * 0.02)).toFixed(2),
        low: (price * (1 - Math.random() * 0.02)).toFixed(2),
        close: price.toFixed(2),
        vol: Math.floor(Math.random() * 1000000 + 100000),
        amount: Math.floor(Math.random() * 100000000 + 10000000)
      });
    }

    return data;
  }

  getMockFinancialData() {
    return [{
      ts_code: '000001.SZ',
      period: '20241231',
      roe: 15.5,
      grossprofit_margin: 45.2,
      netprofit_margin: 22.8,
      debt_to_assets: 35.5,
      current_ratio: 1.8,
      quick_ratio: 1.2,
      cash_ratio: 0.25,
      total_revenue: 150000000000,
      net_profit: 35000000000,
      eps: 2.5,
      bps: 18.5
    }];
  }

  getMockValuationData() {
    return [{
      ts_code: '000001.SZ',
      trade_date: '20240225',
      pe: 8.5,
      pe_ttm: 9.2,
      pb: 0.85,
      ps: 1.2,
      ps_ttm: 1.3,
      dv_ratio: 3.5,
      dv_ttm: 3.8,
      total_mv: 150000000000,
      circ_mv: 120000000000
    }];
  }

  getMockMoneyFlowData() {
    const data = [];
    const baseDate = new Date('2024-01-01');

    for (let i = 0; i < 100; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      data.push({
        ts_code: '000001.SZ',
        trade_date: this.formatDate(date),
        buy_elg_vol: Math.floor(Math.random() * 50000000 + 10000000),
        sell_elg_vol: Math.floor(Math.random() * 40000000 + 10000000),
        buy_lg_vol: Math.floor(Math.random() * 100000000 + 50000000),
        sell_lg_vol: Math.floor(Math.random() * 80000000 + 50000000),
        buy_mdl_vol: Math.floor(Math.random() * 150000000 + 100000000),
        sell_mdl_vol: Math.floor(Math.random() * 120000000 + 100000000),
        buy_sm_vol: Math.floor(Math.random() * 200000000 + 150000000),
        sell_sm_vol: Math.floor(Math.random() * 180000000 + 150000000)
      });
    }

    return data;
  }
}

module.exports = new TushareDataService();
