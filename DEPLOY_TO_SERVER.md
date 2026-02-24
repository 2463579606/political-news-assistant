# 🚀 政治新闻助手 - 部署指南

## 📋 服务器信息
- **IP地址**: 101.201.150.140
- **系统**: 宝塔Linux面板
- **状态**: 准备就绪

---

## 🔑 重要信息保存

**数据库密码（稍后生成）**: 请保存到安全位置
**服务器密码**: Jyz20030910

---

## 📝 部署方式选择

我为你准备了两种部署方式：

### 方式1：通过宝塔面板部署（推荐新手）
- 可视化操作
- 简单直观
- 适合不熟悉命令行的用户

### 方式2：通过SSH命令部署（推荐熟练用户）
- 快速高效
- 完全自动化
- 适合熟悉Linux的用户

---

## 🎯 方式1：宝塔面板部署（推荐）

### 步骤1：登录宝塔面板

1. 打开浏览器访问：`http://101.201.150.140:8888`
2. 输入用户名和密码（服务器密码：Jyz20030910）

### 步骤2：安装软件套件

在宝塔面板中：
1. 点击"软件商店"
2. 安装以下软件：
   - **Nginx**（点击安装）
   - **MySQL 8.0**（点击安装）
   - **Node.js版本管理器**（点击安装）
   - **Node.js 20.x**（在版本管理器中安装）

等待安装完成（约5-10分钟）

### 步骤3：创建网站

1. 点击"网站"
2. 点击"添加站点"
3. 填写信息：
   - 域名：`101.201.150.140`
   - 根目录：`/www/wwwroot/political-news`
   - PHP版本：纯静态
4. 点击"提交"

### 步骤4：上传代码

**在宝塔面板中**：
1. 点击"文件"
2. 进入 `/www/wwwroot`
3. 创建文件夹：`political-news`
4. 上传本地项目的所有文件到这个文件夹

**或者使用Git**（需要通过SSH）：
```bash
cd /www/wwwroot/political-news
git clone https://github.com/yourusername/political-news-assistant.git
```

### 步骤5：配置数据库

1. 在宝塔面板点击"数据库"
2. 点击"添加数据库"
3. 填写：
   - 数据库名：`political_news`
   - 用户名：`newsuser`
   - 密码：自定义（请记住！）
4. 点击"提交"

### 步骤6：安装依赖并启动

在SSH终端或宝塔面板的"终端"中：

```bash
# 进入项目目录
cd /www/wwwroot/political-news

# 安装后端依赖
cd backend
npm install

# 配置数据库
cat > .env <<EOF
DB_HOST=localhost
DB_USER=newsuser
DB_PASSWORD=你的数据库密码
DB_NAME=political_news
PORT=3001
NODE_ENV=production
EOF

# 初始化数据库
node db-init.js

# 启动后端
pm2 start simple-server.js --name backend
pm2 save

# 安装前端依赖
cd ../frontend
npm install

# 构建前端
npm run build

# 启动前端
pm2 start npm --name frontend -- start
pm2 save
```

---

## 🎯 方式2：SSH命令部署（快速）

### 步骤1：连接到服务器

**Windows用户**：
- 下载SSH工具：[MobaXterm](https://mobaxterm.mobatek.net/) 或 [PuTTY](https://www.putty.org/)
- 输入IP：`101.201.150.140`
- 端口：`22`
- 用户名：`root`
- 密码：`Jyz20030910`

**Mac/Linux用户**：
```bash
ssh root@101.201.150.140
# 输入密码：Jyz20030910
```

### 步骤2：上传代码

**选择一种方式**：

**方式A：使用Git（推荐）**
```bash
cd /var/www
git clone https://github.com/yourusername/political-news-assistant.git
```

**方式B：手动上传（使用宝塔或SFTP工具）**
1. 在本地项目目录执行：
```bash
# 打包项目（排除node_modules）
tar -czf political-news.tar.gz --exclude=node_modules --exclude=.next .
```
2. 通过SFTP上传到服务器的 `/root` 目录
3. 在服务器上解压：
```bash
cd /root
tar -xzf political-news.tar.gz -C /var/www/political-news
```

### 步骤3：运行部署脚本

```bash
cd /var/www/political-news
chmod +x deploy.sh
./deploy.sh
```

这个脚本会自动：
- ✅ 安装Node.js 20.x
- ✅ 安装MySQL数据库
- ✅ 安装Nginx
- ✅ 配置防火墙
- ✅ 创建数据库和用户
- ✅ 生成环境配置

**数据库密码**会显示在终端，请保存好！

### 步骤4：部署应用

```bash
# 后端部署
cd /var/www/political-news/backend
npm install
node db-init.js
pm2 start simple-server.js --name backend
pm2 save
pm2 startup

# 前端部署
cd /var/www/political-news/frontend
npm install
npm run build
pm2 start npm --name frontend -- start
pm2 save
```

---

## ⚙️ 配置Nginx反向代理

### 创建Nginx配置文件

```bash
vim /etc/nginx/conf.d/political-news.conf
```

粘贴以下内容：
```nginx
server {
    listen 80;
    server_name 101.201.150.140;

    # 前端（Next.js）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 重启Nginx

```bash
nginx -t
nginx -s reload
```

---

## 🔥 配置阿里云安全组

### 重要！必须在阿里云控制台操作

1. 登录阿里云控制台：https://ecs.console.aliyun.com
2. 进入"云服务器 ECS"
3. 找到你的服务器（IP: 101.201.150.140）
4. 点击"更多" → "网络和安全组" → "安全组配置"
5. 添加入方向规则：

| 端口 | 协议 | 授权对象 | 说明 |
|------|------|----------|------|
| 80 | TCP | 0.0.0.0/0 | HTTP访问 |
| 443 | TCP | 0.0.0.0/0 | HTTPS访问 |
| 22 | TCP | 0.0.0.0/0 | SSH |
| 3001 | TCP | 0.0.0.0/0 | 后端API |
| 8888 | TCP | 0.0.0.0/0 | 宝塔面板 |

---

## ✅ 测试访问

部署完成后，在浏览器中访问：

```
http://101.201.150.140
```

你应该能看到政治新闻助手的界面！

---

## 📊 监控命令

```bash
# 查看应用状态
pm2 status

# 查看后端日志
pm2 logs backend

# 查看前端日志
pm2 logs frontend

# 重启应用
pm2 restart all

# 查看Nginx日志
tail -f /var/log/nginx/access.log
```

---

## 🆘 常见问题

### 1. 无法访问网站

- 检查安全组配置（阿里云控制台）
- 检查防火墙状态
- 查看PM2日志：`pm2 logs`

### 2. 数据库连接失败

- 检查MySQL状态：`systemctl status mysql`
- 验证密码
- 查看后端日志

### 3. 前端页面空白

- 检查前端构建：`cd frontend && npm run build`
- 查看PM2日志：`pm2 logs frontend`

---

## 📞 需要帮助？

部署过程中遇到问题，告诉我：
1. 当前在哪个步骤
2. 看到的错误信息
3. 截图（如果有的话）

我会帮你解决！
