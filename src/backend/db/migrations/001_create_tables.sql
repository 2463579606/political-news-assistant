-- AI智能投资决策助手 v2.0 数据库表结构
-- 创建日期: 2026-02-24

-- 表1: news_events (新闻事件表)
CREATE TABLE IF NOT EXISTS news_events (
    id SERIAL PRIMARY KEY,
    news_id INTEGER,

    -- 事件信息
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- 事件分类
    event_type VARCHAR(50) NOT NULL,  -- policy/meeting/macro_data/emergency/market
    importance_score DECIMAL(3,2) CHECK (importance_score BETWEEN 0 AND 10),

    -- 情感分析
    sentiment VARCHAR(20) NOT NULL,  -- positive/neutral/negative
    sentiment_score DECIMAL(4,3) CHECK (sentiment_score BETWEEN -1 AND 1),

    -- 影响评估
    impact_duration VARCHAR(20) NOT NULL,  -- short/medium/long
    impact_sectors JSONB,
    impact_stocks JSONB,

    -- 置信度
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),

    -- 时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 索引
    CONSTRAINT chk_event_type CHECK (event_type IN ('policy', 'meeting', 'macro_data', 'emergency', 'market')),
    CONSTRAINT chk_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    CONSTRAINT chk_impact_duration CHECK (impact_duration IN ('short', 'medium', 'long'))
);

CREATE INDEX IF NOT EXISTS idx_news_events_type ON news_events(event_type);
CREATE INDEX IF NOT EXISTS idx_news_events_importance ON news_events(importance_score);
CREATE INDEX IF NOT EXISTS idx_news_events_sentiment ON news_events(sentiment);

-- 表2: market_data (行情数据表)
CREATE TABLE IF NOT EXISTS market_data (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(100),

    -- K线数据
    trade_date DATE NOT NULL,
    open_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    volume BIGINT,
    amount DECIMAL(20,2),

    -- 移动平均线
    ma5 DECIMAL(10,2),
    ma10 DECIMAL(10,2),
    ma20 DECIMAL(10,2),
    ma60 DECIMAL(10,2),

    -- MACD
    macd DECIMAL(10,2),
    macd_signal DECIMAL(10,2),
    macd_hist DECIMAL(10,2),

    -- RSI
    rsi6 DECIMAL(5,2),
    rsi12 DECIMAL(5,2),
    rsi24 DECIMAL(5,2),

    -- KDJ
    kdj_k DECIMAL(5,2),
    kdj_d DECIMAL(5,2),
    kdj_j DECIMAL(5,2),

    -- BOLL
    boll_upper DECIMAL(10,2),
    boll_mid DECIMAL(10,2),
    boll_lower DECIMAL(10,2),

    -- 唯一约束和索引
    UNIQUE(stock_code, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_market_data_stock_date ON market_data(stock_code, trade_date);
CREATE INDEX IF NOT EXISTS idx_market_data_trade_date ON market_data(trade_date);

-- 表3: fund_flow (资金流向表)
CREATE TABLE IF NOT EXISTS fund_flow (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(100),
    trade_date DATE NOT NULL,

    -- 主力资金
    main_inflow DECIMAL(20,2),
    main_outflow DECIMAL(20,2),
    main_net DECIMAL(20,2),
    main_net_ratio DECIMAL(5,2),

    -- 超大单
    superlarge_inflow DECIMAL(20,2),
    superlarge_outflow DECIMAL(20,2),
    superlarge_net DECIMAL(20,2),

    -- 大单
    large_inflow DECIMAL(20,2),
    large_outflow DECIMAL(20,2),
    large_net DECIMAL(20,2),

    -- 中单
    medium_inflow DECIMAL(20,2),
    medium_outflow DECIMAL(20,2),
    medium_net DECIMAL(20,2),

    -- 小单
    small_inflow DECIMAL(20,2),
    small_outflow DECIMAL(20,2),
    small_net DECIMAL(20,2),

    -- 北向资金
    northbound_inflow DECIMAL(20,2),
    northbound_outflow DECIMAL(20,2),
    northbound_net DECIMAL(20,2),

    UNIQUE(stock_code, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_fund_flow_stock_date ON fund_flow(stock_code, trade_date);
CREATE INDEX IF NOT EXISTS idx_fund_flow_trade_date ON fund_flow(trade_date);
CREATE INDEX IF NOT EXISTS idx_fund_flow_main_net ON fund_flow(main_net);

-- 表4: decisions (决策表)
CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,

    -- 关联
    stock_code VARCHAR(10) NOT NULL,
    news_event_id INTEGER REFERENCES news_events(id),

    -- 决策信息
    decision_type VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),

    -- 评分
    total_score INTEGER CHECK (total_score BETWEEN 0 AND 100),
    news_score INTEGER CHECK (news_score BETWEEN 0 AND 100),
    technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 100),
    fund_score INTEGER CHECK (fund_score BETWEEN 0 AND 100),
    sector_score INTEGER CHECK (sector_score BETWEEN 0 AND 100),

    -- 目标价位
    target_price_1 DECIMAL(10,2),
    target_price_2 DECIMAL(10,2),
    stop_loss_price DECIMAL(10,2),

    -- 风险评估
    risk_level VARCHAR(20),
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),

    -- 决策依据
    reasoning TEXT,

    -- 时间
    decision_time TIMESTAMP NOT NULL,
    expire_time TIMESTAMP,

    -- 验证状态
    is_validated BOOLEAN DEFAULT FALSE,
    actual_result DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_decision_type CHECK (decision_type IN ('buy', 'sell', 'hold')),
    CONSTRAINT chk_risk_level CHECK (risk_level IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_decisions_stock ON decisions(stock_code);
CREATE INDEX IF NOT EXISTS idx_decisions_decision_time ON decisions(decision_time);
CREATE INDEX IF NOT EXISTS idx_decisions_decision_type ON decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_decisions_validated ON decisions(is_validated);

-- 表5: sector_rotation (板块轮动表)
CREATE TABLE IF NOT EXISTS sector_rotation (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,

    -- 板块信息
    sector_code VARCHAR(20) NOT NULL,
    sector_name VARCHAR(100) NOT NULL,

    -- 热度指标
    hot_score DECIMAL(5,2),
    rank_position INTEGER,

    -- 资金流向
    fund_inflow DECIMAL(20,2),
    fund_outflow DECIMAL(20,2),
    fund_net DECIMAL(20,2),

    -- 涨跌统计
    avg_change_pct DECIMAL(5,2),
    rising_stocks INTEGER,
    falling_stocks INTEGER,
    limit_up_stocks INTEGER,
    limit_down_stocks INTEGER,

    UNIQUE(sector_code, date)
);

CREATE INDEX IF NOT EXISTS idx_sector_rotation_date ON sector_rotation(date);
CREATE INDEX IF NOT EXISTS idx_sector_rotation_hot_score ON sector_rotation(hot_score);

-- 插入一些测试数据
COMMENT ON TABLE news_events IS '新闻事件表';
COMMENT ON TABLE market_data IS '行情数据表';
COMMENT ON TABLE fund_flow IS '资金流向表';
COMMENT ON TABLE decisions IS '投资决策表';
COMMENT ON TABLE sector_rotation IS '板块轮动表';
