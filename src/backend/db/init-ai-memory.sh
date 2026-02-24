#!/bin/bash

# AI学习记忆系统 - 数据库初始化脚本
# 日期: 2026-02-23

set -e

echo "========================================="
echo "AI学习记忆系统 - 数据库初始化"
echo "========================================="

# 数据库配置
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="political_news"
DB_USER="political_news_user"
DB_PASS="political_news_pass"

# SQL文件路径
SQL_FILE="$(dirname "$0")/ai-memory-schema.sql"

echo ""
echo "数据库配置："
echo "  主机: $DB_HOST:$DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 检查SQL文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo "错误: SQL文件不存在: $SQL_FILE"
    exit 1
fi

echo "正在执行数据库初始化..."
echo ""

# 执行SQL文件
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ 数据库初始化成功！"
    echo "========================================="
    echo ""
    echo "已创建以下表："
    echo "  1. event_memory - 事件记忆表"
    echo "  2. market_memory - 市场记忆表"
    echo "  3. news_market_correlation - 新闻市场关联表"
    echo "  4. learning_log - 学习日志表"
    echo "  5. prediction_record - 预测记录表"
    echo "  6. historical_event_comparison - 历史事件对比表"
    echo "  7. user_feedback - 用户反馈表"
    echo ""
    echo "已创建以下视图："
    echo "  1. v_event_market_summary - 事件市场关联摘要"
    echo ""
    echo "已创建以下函数："
    echo "  1. get_learning_stats() - 获取学习统计"
    echo ""
    echo "数据库准备就绪！"
else
    echo ""
    echo "========================================="
    echo "❌ 数据库初始化失败！"
    echo "========================================="
    exit 1
fi
