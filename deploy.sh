#!/bin/bash

# ============================================
# 政治新闻助手 - 自动化部署脚本
# 适用于: 阿里云轻量应用服务器
# 系统: Aliyun Cloud Linux 3.0 / Ubuntu
# ============================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  政治新闻助手 - 自动化部署"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤1: 检查系统环境
echo -e "${GREEN}[步骤 1/9]${NC} 检查系统环境..."
echo "操作系统信息:"
uname -a
echo ""

# 检测系统类型
if [ -f /etc/redhat-release ]; then
    echo "检测到: Aliyun Cloud Linux / CentOS 系列"
    PKG_MANAGER="yum"
    MYSQL_SERVICE="mysqld"
    NGINX_CONF_DIR="/etc/nginx"
elif [ -f /etc/debian_version ]; then
    echo "检测到: Ubuntu / Debian 系列"
    PKG_MANAGER="apt"
    MYSQL_SERVICE="mysql"
    NGINX_CONF_DIR="/etc/nginx"
else
    echo -e "${RED}未知的系统类型${NC}"
    exit 1
fi
echo "✓ 系统环境检查完成"
echo ""

# 步骤2: 更新系统并安装基础工具
echo -e "${GREEN}[步骤 2/9]${NC} 更新系统并安装基础工具..."
if [ "$PKG_MANAGER" = "yum" ]; then
    yum update -y
    yum install -y curl wget git vim unzip
elif [ "$PKG_MANAGER" = "apt" ]; then
    apt update -y
    apt upgrade -y
    apt install -y curl wget git vim unzip
fi
echo "✓ 基础工具安装完成"
echo ""

# 步骤3: 安装Node.js 20.x
echo -e "${GREEN}[步骤 3/9]${NC} 安装Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - || \
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

if [ "$PKG_MANAGER" = "yum" ]; then
    yum install -y nodejs
elif [ "$PKG_MANAGER" = "apt" ]; then
    apt install -y nodejs
fi

# 验证安装
node_version=$(node -v)
npm_version=$(npm -v)
echo "✓ Node.js安装完成: $node_version"
echo "✓ npm安装完成: $npm_version"
echo ""

# 安装PM2
echo "安装PM2进程管理器..."
npm install -g pm2
echo "✓ PM2安装完成"
echo ""

# 步骤4: 安装MySQL
echo -e "${GREEN}[步骤 4/9]${NC} 安装MySQL数据库..."
if [ "$PKG_MANAGER" = "yum" ]; then
    yum install -y mysql-server
    systemctl start mysqld
    systemctl enable mysqld
elif [ "$PKG_MANAGER" = "apt" ]; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi

# 等待MySQL启动
sleep 5

echo "✓ MySQL安装完成"
echo ""

# 步骤5: 配置MySQL数据库
echo -e "${GREEN}[步骤 5/9]${NC} 配置MySQL数据库..."
echo "正在创建数据库和用户..."

# 生成随机密码
DB_PASS="NewsDB@$(date +%Y)$(date +%m)!"

# 创建数据库和用户（使用临时root密码）
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS political_news CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'newsuser'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON political_news.* TO 'newsuser'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "✓ 数据库创建完成"
echo "✓ 数据库用户: newsuser"
echo "✓ 数据库密码: $DB_PASS"
echo "⚠️  请保存好数据库密码！"
echo ""

# 步骤6: 安装Nginx
echo -e "${GREEN}[步骤 6/9]${NC} 安装Nginx..."
if [ "$PKG_MANAGER" = "yum" ]; then
    yum install -y nginx
elif [ "$PKG_MANAGER" = "apt" ]; then
    apt install -y nginx
fi

systemctl start nginx
systemctl enable nginx
echo "✓ Nginx安装完成"
echo ""

# 步骤7: 创建项目目录
echo -e "${GREEN}[步骤 7/9]${NC} 创建项目目录..."
mkdir -p /var/www/political-news
cd /var/www/political-news

echo "✓ 项目目录创建完成: /var/www/political-news"
echo ""

# 步骤8: 配置防火墙
echo -e "${GREEN}[步骤 8/9]${NC} 配置防火墙..."

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "✓ UFW防火墙配置完成"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "✓ firewalld防火墙配置完成"
else
    echo "⚠️  防火墙未配置，请手动配置阿里云安全组"
fi
echo ""

# 步骤9: 创建环境变量文件
echo -e "${GREEN}[步骤 9/9]${NC} 创建环境配置..."

# 后端.env
cat > /var/www/political-news/backend/.env <<EOF
DB_HOST=localhost
DB_USER=newsuser
DB_PASSWORD=$DB_PASS
DB_NAME=political_news
PORT=3001
NODE_ENV=production
EOF

# 前端.env
cat > /var/www/political-news/frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://101.201.150.140:3001
EOF

echo "✓ 环境配置文件创建完成"
echo ""

# 保存数据库密码到文件
echo "$DB_PASS" > /var/www/political-news/db_password.txt
chmod 600 /var/www/political-news/db_password.txt

echo "=========================================="
echo -e "${GREEN}✓ 环境准备完成！${NC}"
echo "=========================================="
echo ""
echo "数据库密码已保存到: /var/www/political-news/db_password.txt"
echo ""
echo "下一步操作："
echo "1. 将项目代码上传到服务器"
echo "2. 运行部署脚本"
echo ""
echo "=========================================="
