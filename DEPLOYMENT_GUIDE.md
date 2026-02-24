# 政治新闻助手 - 阿里云部署指南

## 📋 需要提供的信息

### 必需信息：
1. **服务器访问信息**
   - 服务器公网IP地址
   - SSH root密码或密钥文件

2. **环境配置信息**
   - Node.js版本偏好（建议18.x或20.x）
   - 数据库密码（MySQL）
   - 是否需要配置HTTPS（需要域名）

### 可选信息：
3. **域名配置**（如果需要通过域名访问）
   - 域名
   - DNS服务商（阿里云/腾讯云/Cloudflare等）

4. **AI服务配置**
   - OpenAI API Key（或智谱AI API Key）
   - 如果不用AI，系统会使用模拟数据

---

## 🛒 阿里云服务器购买建议

### 推荐配置（适合个人使用）：
- **CPU**: 2核
- **内存**: 4GB
- **带宽**: 5Mbps（按使用量计费或固定带宽）
- **系统盘**: 40GB SSD
- **操作系统**: Ubuntu 22.04 64位 或 CentOS 7.9 64位

### 预估成本：
- 服务器：约 ¥100-150/月
- 带宽：约 ¥30-50/月
- **总计：约 ¥130-200/月**

---

## 🚀 快速部署命令

购买服务器后，复制以下命令执行：

```bash
# 第一步：连接服务器
ssh root@your_server_ip

# 第二步：一键安装所有依赖
curl -fsSL https://raw.githubusercontent.com/yourusername/political-news-assistant/main/install.sh | bash

# 第三步：配置数据库
mysql -u root -p
# 在MySQL中执行：
# CREATE DATABASE political_news CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# CREATE USER 'newsuser'@'localhost' IDENTIFIED BY 'YourPassword123!';
# GRANT ALL PRIVILEGES ON political_news.* TO 'newsuser'@'localhost';
# FLUSH PRIVILEGES;

# 第四步：上传并启动应用
cd /var/www
git clone https://github.com/yourusername/political-news-assistant.git
cd political-news-assistant
./deploy.sh
```

---

## 📝 需要你提供的信息清单

部署前请准备好：

1. ✅ 服务器公网IP：`_____________`
2. ✅ SSH root密码：`_____________`
3. ✅ 数据库密码：`_____________`（建议使用强密码）
4. ✅ 域名（可选）：`_____________`
5. ✅ OpenAI/智谱API Key（可选）：`_____________`

准备好这些信息后，我可以协助你完成部署！
