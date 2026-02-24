#!/bin/bash
# 政治新闻助手 - 前端构建修复脚本
# 在服务器上运行此脚本以修复前端构建问题

set -e

echo "========================================="
echo "政治新闻助手 - 前端修复脚本"
echo "========================================="
echo ""

# 步骤 1: 停止前端服务
echo "步骤 1: 停止前端服务..."
pm2 stop political-frontend || echo "前端服务未运行"

# 步骤 2: 进入前端目录
echo "步骤 2: 进入前端目录..."
cd /var/www/political-news/src/frontend

# 步骤 3: 备份并修复 layout.tsx
echo "步骤 3: 修复 layout.tsx (移除 Google Fonts)..."
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "时政新闻助手 | Political News Assistant",
  description: "智能聚合时政要闻，AI助手深度解读",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
EOF

# 步骤 4: 清理旧的构建文件
echo "步骤 4: 清理旧的构建文件..."
rm -rf .next
rm -rf node_modules/.cache

# 步骤 5: 重新构建
echo "步骤 5: 开始构建前端 (这可能需要几分钟)..."
NODE_ENV=production npm run build

# 步骤 6: 重启前端服务
echo "步骤 6: 重启前端服务..."
pm2 restart political-frontend

# 步骤 7: 检查服务状态
echo "步骤 7: 检查服务状态..."
sleep 3
pm2 status

echo ""
echo "========================================="
echo "✅ 前端修复完成！"
echo "========================================="
echo ""
echo "前端访问地址: http://101.201.150.140:3000"
echo "后端API地址: http://101.201.150.140:3001"
echo ""
echo "查看日志:"
echo "  pm2 logs political-frontend"
echo "  pm2 logs political-backend"
echo ""
