-- AI学习记忆系统数据库表结构
-- Version: 1.0
-- Date: 2026-02-23

-- =====================================================
-- 1. 事件记忆表 - 存储每日时政事件
-- =====================================================
CREATE TABLE IF NOT EXISTS event_memory (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,  -- 政策发布/会议/宏观数据/突发事件/国际要闻
    event_title TEXT NOT NULL,
    event_content TEXT,

    -- 重要性评分 (1-5, 5最重要)
    importance INT DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),

    -- 情感倾向 (-1负面, 0中性, 1正面)
    sentiment INT DEFAULT 0 CHECK (sentiment BETWEEN -1 AND 1),

    -- 关联信息
    related_stocks TEXT[],  -- 相关股票代码 ['600519', '000858']
    related_sectors TEXT[],  -- 相关板块 ['白酒', '新能源']

    -- 关键词提取
    keywords TEXT[],  -- ['降息', '央行', 'MLF']

    -- 向量嵌入 (用于相似事件检索)
    vector_embedding VECTOR(1536),

    -- 来源信息
    source_name VARCHAR(100),  -- 人民日报/新华社等
    source_url TEXT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_event_date ON event_memory(event_date DESC);
CREATE INDEX idx_event_type ON event_memory(event_type);
CREATE INDEX idx_importance ON event_memory(importance DESC);
CREATE INDEX idx_sentiment ON event_memory(sentiment);
CREATE INDEX idx_vector_embedding ON event_memory USING ivfflat (vector_embedding vector_cosine_ops);

-- =====================================================
-- 2. 市场记忆表 - 存储每日行情数据
-- =====================================================
CREATE TABLE IF NOT EXISTS market_memory (
    id SERIAL PRIMARY KEY,
    trade_date DATE NOT NULL UNIQUE,

    -- 指数数据 [上证, 深证, 创业板, 沪深300]
    index_change NUMERIC[],
    index_close NUMERIC[],
    index_volume BIGINT[],

    -- 市场情绪
    market_mood VARCHAR(20),  -- 强势/震荡/弱势
    market_score NUMERIC,  -- 市场评分 0-100

    -- 板块数据
    hot_sectors TEXT[],  -- 热门板块
    cold_sectors TEXT[],  -- 冷门板块
    sector_rotation TEXT,  -- 板块轮动描述

    -- 资金数据
    north_money NUMERIC DEFAULT 0,  -- 北向资金净流入(亿)
    total_turnover NUMERIC,  -- 两市成交额(亿)

    -- 涨跌统计
    up_count INT DEFAULT 0,  -- 上涨家数
    down_count INT DEFAULT 0,  -- 下跌家数
    limit_up_count INT DEFAULT 0,  -- 涨停家数
    limit_down_count INT DEFAULT 0,  -- 跌停家数

    -- 当日总结
    summary TEXT,  -- 市场总结
    key_events TEXT[],  -- 关键事件ID数组

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_market_date ON market_memory(trade_date DESC);
CREATE INDEX idx_market_mood ON market_memory(market_mood);

-- =====================================================
-- 3. 新闻-市场关联表 - 核心分析结果
-- =====================================================
CREATE TABLE IF NOT EXISTS news_market_correlation (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES event_memory(id) ON DELETE CASCADE,
    market_id INT REFERENCES market_memory(id) ON DELETE CASCADE,

    -- 关联度评分 (0-1, 越高关联越强)
    correlation_score NUMERIC NOT NULL CHECK (correlation_score BETWEEN 0 AND 1),

    -- 影响方向
    impact_direction INT CHECK (impact_direction BETWEEN -1 AND 1),
    -- 1: 正面影响(涨), -1: 负面影响(跌), 0: 无明显影响

    -- 影响力度
    impact_strength INT CHECK (impact_strength BETWEEN 1 AND 5),
    -- 1: 轻微, 2: 一般, 3: 明显, 4: 显著, 5: 剧烈

    -- 影响持续时间
    impact_duration INT DEFAULT 1,  -- 影响持续天数
    impact_peak_day INT DEFAULT 0,  -- 影响高峰在第几天(0当天)

    -- 影响范围
    affected_sectors TEXT[],  -- 受影响板块
    affected_stocks TEXT[],  -- 受影响股票

    -- 分析详情
    analysis_text TEXT,  -- 分析说明
    confidence_score NUMERIC,  -- 分析置信度 0-1

    -- 验证结果
    is_verified BOOLEAN DEFAULT FALSE,  -- 是否已验证
    actual_impact NUMERIC,  -- 实际影响程度

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_correlation_event ON news_market_correlation(event_id);
CREATE INDEX idx_correlation_market ON news_market_correlation(market_id);
CREATE INDEX idx_correlation_score ON news_market_correlation(correlation_score DESC);
CREATE INDEX idx_correlation_impact ON news_market_correlation(impact_direction);

-- =====================================================
-- 4. 学习日志表 - 记录AI学习进度
-- =====================================================
CREATE TABLE IF NOT EXISTS learning_log (
    id SERIAL PRIMARY KEY,
    log_date DATE NOT NULL UNIQUE,

    -- 学习统计
    news_learned INT DEFAULT 0,  -- 学习的新闻条数
    events_extracted INT DEFAULT 0,  -- 提取的事件数
    correlations_found INT DEFAULT 0,  -- 发现的关联数

    -- 预测准确度
    accuracy_score NUMERIC,  -- 综合准确度 0-1
    direction_accuracy NUMERIC,  -- 方向预测准确度
    sector_accuracy NUMERIC,  -- 板块预测准确度

    -- 模型信息
    model_version VARCHAR(20),
    model_params JSONB,  -- 模型参数

    -- 学习效果
    learning_rate NUMERIC,  -- 学习率
    convergence_score NUMERIC,  -- 收敛度

    -- 备注
    notes TEXT,
    errors TEXT,  -- 错误日志

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_learning_date ON learning_log(log_date DESC);
CREATE INDEX idx_learning_accuracy ON learning_log(accuracy_score DESC);

-- =====================================================
-- 5. 预测记录表 - 跟踪预测准确性
-- =====================================================
CREATE TABLE IF NOT EXISTS prediction_record (
    id SERIAL PRIMARY KEY,
    predict_date DATE NOT NULL,  -- 预测日期
    target_date DATE NOT NULL,  -- 目标日期

    -- 预测类型
    prediction_type VARCHAR(50),  -- 短期/中期/长期

    -- 预测内容
    predicted_sectors TEXT[],  -- 预测热门板块
    predicted_direction VARCHAR(20),  -- 预测方向(涨/跌/震荡)
    predicted_range NUMERIC[],  -- 预测指数范围

    -- 依据事件
    basis_event_ids INT[],  -- 基于的事件ID数组

    -- 实际结果
    actual_sectors TEXT[],
    actual_direction VARCHAR(20),
    actual_range NUMERIC[],

    -- 准确度评估
    is_correct BOOLEAN,
    accuracy_score NUMERIC CHECK (accuracy_score BETWEEN 0 AND 1),

    -- 置信度
    confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),

    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX idx_prediction_date ON prediction_record(predict_date DESC);
CREATE INDEX idx_prediction_target ON prediction_record(target_date);
CREATE INDEX idx_prediction_type ON prediction_record(prediction_type);
CREATE INDEX idx_prediction_accuracy ON prediction_record(accuracy_score DESC);

-- =====================================================
-- 6. 历史事件对比表 - 相似事件检索结果
-- =====================================================
CREATE TABLE IF NOT EXISTS historical_event_comparison (
    id SERIAL PRIMARY KEY,
    current_event_id INT REFERENCES event_memory(id),
    historical_event_id INT REFERENCES event_memory(id),

    -- 相似度
    similarity_score NUMERIC NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),

    -- 相似维度
    content_similarity NUMERIC,  -- 内容相似度
    context_similarity NUMERIC,  -- 上下文相似度
    timing_similarity NUMERIC,  -- 时间相似度

    -- 历史影响
    historical_impact TEXT,  -- 历史影响描述
    market_reaction TEXT,  -- 当时市场反应

    -- 对比分析
    comparison_text TEXT,  -- 对比分析文本

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comparison_current ON historical_event_comparison(current_event_id);
CREATE INDEX idx_similarity ON historical_event_comparison(similarity_score DESC);

-- =====================================================
-- 7. 用户反馈表 - 持续优化
-- =====================================================
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    feedback_date DATE NOT NULL,

    -- 反馈类型
    feedback_type VARCHAR(50),  -- 预测准确/新闻相关/功能建议

    -- 反馈内容
    rating INT CHECK (rating BETWEEN 1 AND 5),  -- 评分
    comment TEXT,  -- 评论

    -- 关联信息
    related_prediction_id INT REFERENCES prediction_record(id),
    related_event_id INT REFERENCES event_memory(id),

    -- 处理状态
    is_processed BOOLEAN DEFAULT FALSE,
    processing_notes TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_date ON user_feedback(feedback_date DESC);
CREATE INDEX idx_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_feedback_rating ON user_feedback(rating);

-- =====================================================
-- 触发器和函数
-- =====================================================

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_event_memory_updated_at BEFORE UPDATE ON event_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_memory_updated_at BEFORE UPDATE ON market_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 视图：事件-市场关联摘要
-- =====================================================
CREATE OR REPLACE VIEW v_event_market_summary AS
SELECT
    em.event_date,
    em.event_type,
    em.event_title,
    em.importance,
    em.sentiment,
    mm.trade_date,
    mm.market_mood,
    mm.index_change,
    nmc.correlation_score,
    nmc.impact_direction,
    nmc.impact_strength,
    nmc.affected_sectors
FROM event_memory em
JOIN news_market_correlation nmc ON em.id = nmc.event_id
JOIN market_memory mm ON nmc.market_id = mm.id
ORDER BY em.event_date DESC, nmc.correlation_score DESC;

-- =====================================================
-- 数据统计函数
-- =====================================================

-- 获取学习统计
CREATE OR REPLACE FUNCTION get_learning_stats(days INT DEFAULT 30)
RETURNS TABLE (
    date DATE,
    news_count BIGINT,
    event_count BIGINT,
    correlation_count BIGINT,
    accuracy_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ll.log_date::DATE,
        ll.news_learned,
        ll.events_extracted,
        ll.correlations_found,
        ll.accuracy_score
    FROM learning_log ll
    WHERE ll.log_date >= CURRENT_DATE - days
    ORDER BY ll.log_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 初始化数据
-- =====================================================

-- 插入第一条学习日志
INSERT INTO learning_log (
    log_date,
    news_learned,
    events_extracted,
    correlations_found,
    accuracy_score,
    model_version,
    notes
) VALUES (
    CURRENT_DATE,
    0,
    0,
    0,
    0.0,
    'v1.0',
    'AI学习记忆系统初始化完成'
) ON CONFLICT (log_date) DO NOTHING;

-- =====================================================
-- 注释
-- =====================================================

COMMENT ON TABLE event_memory IS '事件记忆表：存储每日时政事件和重要新闻';
COMMENT ON TABLE market_memory IS '市场记忆表：存储每日股市行情数据';
COMMENT ON TABLE news_market_correlation IS '新闻-市场关联表：核心分析结果';
COMMENT ON TABLE learning_log IS '学习日志表：记录AI学习进度和准确度';
COMMENT ON TABLE prediction_record IS '预测记录表：跟踪预测准确性';
COMMENT ON TABLE historical_event_comparison IS '历史事件对比表：相似事件检索';
COMMENT ON TABLE user_feedback IS '用户反馈表：收集用户反馈以优化模型';
