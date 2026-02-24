# 🚀 超简单部署指南 - 5步完成部署

## 📋 你的服务器信息
- **IP地址**: 101.201.150.140
- **密码**: Jyz20030910
- **宝塔面板**: http://101.201.150.140:8888

---

## 🎯 最简单的部署方法（推荐）

### 方法：使用宝塔面板 + 手动上传文件

**优点**：
- ✅ 不需要懂Git
- ✅ 可视化操作
- ✅ 不需要命令行知识
- ✅ 5步完成部署

---

## 📦 第一步：准备代码包

**在本地电脑上操作**：

### Windows用户：
```bash
# 在项目目录中，按住 Shift + 右键
# 选择"在此处打开PowerShell窗口"

# 打包代码（排除大文件）
tar -czf political-news.tar.gz --exclude=node_modules --exclude=.next src backend
```

### Mac/Linux用户：
```bash
# 在项目目录中执行
cd /Users/jiangyz/workspace/projects/political-news-assistant
tar -czf political-news.tar.gz --exclude=node_modules --exclude=.next src backend
```

**或者**：直接压缩 `src` 和 `backend` 文件夹为zip格式

---

## 📤 第二步：上传代码到服务器

### 方式1：使用宝塔面板（最简单）

1. **打开浏览器**访问：http://101.201.150.140:8888
2. **登录**：
   - 用户名：`root`
   - 密码：`Jyz20030910`

3. **上传文件**：
   - 点击左侧"文件"
   - 进入 `/www/wwwroot`
   - 点击"上传"按钮
   - 上传刚才打包的 `political-news.tar.gz` 文件

4. **解压文件**：
   - 在宝塔面板中找到上传的文件
   - 右键点击"解压"
   - 解压到 `/www/wwwroot/political-news`

### 方式2：使用WinSCP（Windows）

1. 下载WinSCP：https://winscp.net/
2. 连接到服务器：
   - 主机名：`101.201.150.140`
   - 端口：`22`
   - 用户名：`root`
   - 密码：`Jyz20030910`
3. 拖拽 `src` 和 `backend` 文件夹到 `/www/wwwroot/political-news`

---

## 🔧 第三步：在宝塔面板安装软件

### 必需软件列表：

1. **Nginx**（Web服务器）
   - 在"软件商店"搜索"Nginx"
   - 点击"安装"
   - 等待安装完成

2. **MySQL 8.0**（数据库）
   - 在"软件商店"搜索"MySQL"
   - 选择"8.0"版本
   - 点击"安装"
   - 设置root密码（请记住！）
   - 等待安装完成

3. **Node.js**（运行环境）
   - 在"软件商店"搜索"Node.js版本管理器"
   - 点击"安装"
   - 安装完成后，点击"设置"
   - 安装"Node.js v20.x"

**等待时间**：约5-10分钟

---

## 💾 第四步：创建数据库

### 在宝塔面板中：

1. 点击左侧"数据库"
2. 点击"添加数据库"
3. 填写信息：
   ```
   数据库名：political_news
   用户名：newsuser
   密码：NewsDB2024!
   访问权限：本地服务器
   ```
4. 点击"提交"

### 保存这些信息：
- 数据库名：`political_news`
- 用户名：`newsuser`
- 密码：`NewsDB2024!`

---

## 💻 第五步：安装依赖并启动

### 打开宝塔面板的"终端"：

1. 点击左侧"终端"
2. 依次执行以下命令：

```bash
# 进入项目目录
cd /www/wwwroot/political-news

# 安装后端依赖
cd backend
npm install

# 创建环境配置文件
cat > .env <<EOF
DB_HOST=localhost
DB_USER=newsuser
DB_PASSWORD=NewsDB2024!
DB_NAME=political_news
PORT=3001
NODE_ENV=production
EOF

# 初始化数据库
node db-init.js

# 安装PM2（进程管理器）
npm install -g pm2

# 启动后端服务
pm2 start simple-server.js --name backend
pm2 save
pm2 startup

# 返回上一级
cd ../frontend

# 安装前端依赖
npm install

# 构建前端（需要几分钟）
npm run build

# 启动前端服务
pm2 start npm --name frontend -- start
pm2 save
```

**等待时间**：约5-10分钟（主要是构建前端）

---

## 🌐 第六步：配置网站

### 在宝塔面板中：

1. 点击"网站"
2. 点击"添加站点"
3. 填写：
   - 域名：`101.201.150.140`
   - 根目录：`/www/wwwroot/political-news/frontend/.next`
   - PHP版本：纯静态
4. 点击"提交"

### 添加反向代理（重要！）：

1. 找到刚创建的网站
2. 点击"设置"
3. 点击"配置文件"
4. 在 `location /` 块中添加：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

5. 点击"保存"

---

## 🔥 第七步：配置安全组（必须！）

### 在阿里云控制台操作：

1. 打开：https://ecs.console.aliyun.com
2. 找到你的服务器：101.201.150.140
3. 点击"安全组"
4. 添加以下规则：

| 端口 | 协议 | 授权对象 |
|------|------|----------|
| 80 | TCP | 0.0.0.0/0 |
| 443 | TCP | 0.0.0.0/0 |
| 22 | TCP | 0.0.0.0/0 |

---

## ✅ 测试访问

### 打开浏览器访问：

```
http://101.201.150.140
```

**如果看到政治新闻助手界面** = 成功！🎉

---

## 📊 查看运行状态

### 在宝塔面板的"终端"中：

```bash
# 查看所有运行的服务
pm2 status

# 查看后端日志
pm2 logs backend

# 查看前端日志
pm2 logs frontend

# 重启所有服务
pm2 restart all
```

---

## 🆘 常见问题解决

### 问题1：无法访问网站

**解决方法**：
1. 检查阿里云安全组是否添加了80端口
2. 在宝塔面板检查Nginx是否运行
3. 在终端检查：`pm2 status`

### 问题2：数据库连接失败

**解决方法**：
1. 检查MySQL是否运行
2. 验证.env文件中的密码是否正确
3. 查看后端日志：`pm2 logs backend`

### 问题3：前端页面空白

**解决方法**：
1. 检查前端是否构建完成
2. 在终端查看：`pm2 logs frontend`
3. 重新构建：`cd /www/wwwroot/political-news/frontend && npm run build`

---

## 📞 需要帮助？

告诉我：
1. 当前在第几步
2. 遇到什么错误
3. 截图（如果可能）

我会帮你解决！ 💪
