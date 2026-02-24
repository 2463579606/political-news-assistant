#!/bin/bash

# 时政新闻助手 - 一键启动脚本

echo "=========================================="
echo "  时政新闻助手 - 启动系统"
echo "=========================================="
echo ""

# 检查PostgreSQL
echo "1. 检查PostgreSQL服务..."
if brew services list | grep postgresql@16 | grep started > /dev/null; then
    echo "   ✓ PostgreSQL正在运行"
else
    echo "   启动PostgreSQL..."
    brew services start postgresql@16
    sleep 2
fi

# 检查后端
echo ""
echo "2. 检查后端服务..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✓ 后端正在运行 (http://localhost:3001)"
else
    echo "   启动后端服务..."
    cd /Users/jiangyz/workspace/projects/political-news-assistant/src/backend
    node simple-server.js > /tmp/political-news-backend.log 2>&1 &
    echo "   后端PID: $!"
    sleep 3

    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✓ 后端启动成功"
    else
        echo "   ✗ 后端启动失败，检查日志: /tmp/political-news-backend.log"
        exit 1
    fi
fi

# 检查前端
echo ""
echo "3. 检查前端服务..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✓ 前端正在运行 (http://localhost:3000)"
else
    echo "   启动前端服务..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 20
    cd /Users/jiangyz/workspace/projects/political-news-assistant/src/frontend
    npm run dev > /tmp/political-news-frontend.log 2>&1 &
    echo "   前端PID: $!"
    sleep 10

    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✓ 前端启动成功"
    else
        echo "   ✗ 前端启动失败，检查日志: /tmp/political-news-frontend.log"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "  系统启动完成！"
echo "=========================================="
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo ""
echo "测试账号："
echo "  邮箱: dbtest@example.com"
echo "  密码: testpass123"
echo ""
echo "数据库连接 (DataGrip)："
echo "  主机: localhost"
echo "  端口: 5432"
echo "  数据库: political_news"
echo "  用户: political_news_user"
echo "  密码: political_news_pass"
echo ""
echo "日志文件："
echo "  后端: tail -f /tmp/political-news-backend.log"
echo "  前端: tail -f /tmp/political-news-frontend.log"
echo ""
echo "停止服务："
echo "  kill \$(lsof -ti:3001)  # 停止后端"
echo "  kill \$(lsof -ti:3000)  # 停止前端"
echo ""
echo "=========================================="
