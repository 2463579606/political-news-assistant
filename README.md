# AI智能投资决策助手 (AI Investment Decision Assistant)

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.9.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**基于时政财经新闻的AI驱动智能投资决策系统**

透过时政财经新闻的表象，AI帮您发现投资机会，提前布局，精准决策。

[核心功能](#-核心功能) • [产品方案](#-产品方案) • [技术架构](#-技术架构) • [快速开始](#-快速开始)

</div>

---

## 📋 项目概述

AI智能投资决策助手是一个基于AI的智能投资决策支持系统，通过分析时政财经新闻，为用户提供：

- **信息降噪** - 5分钟读完重要新闻，自动过滤无关信息
- **洞察发现** - 识别常人忽视的蛛丝马迹，提前发现投资机会
- **决策支持** - 明确到股票代码的操作建议，量化风险评估

### 核心转变

**从**: "时政新闻助手"（新闻聚合工具）
**到**: "AI智能投资决策助手"（投资决策系统）

### 技术栈

**前端**
- Next.js 15 (App Router)
- React 18
- TypeScript
- TailwindCSS
- shadcn/ui

**后端**
- Node.js
- Express API
- PostgreSQL
- FinGPT (金融大语言模型)
- TA-Lib (技术分析)
- ChromaDB (向量数据库)

**AI能力**
- Anthropic Claude API (事件提取)
- FinBERT (情感分析)
- FinGPT (金融分析)
- RAG增强检索

---

## ✨ 核心功能

### 1. 智能新闻分析

- ✅ **事件自动提取** - 从新闻中自动识别重要事件
- ✅ **情感分析** - 分析新闻对市场的影响方向
- ✅ **板块映射** - 自动关联受影响的板块和股票
- ✅ **相似事件检索** - 基于历史案例对比分析

### 2. 多维度市场分析

- ✅ **技术分析** - MACD、RSI、KDJ、BOLL等技术指标
- ✅ **资金流向** - 主力资金、北向资金追踪
- ✅ **板块轮动** - 识别热点板块切换
- ✅ **综合评分** - 多维度量化评分系统

### 3. 投资决策建议

- ✅ **明确建议** - 买入/卖出/持有建议
- ✅ **目标价位** - 第一目标、第二目标价位
- ✅ **风险提示** - 量化风险评估
- ✅ **止损止盈** - 具体的止损止盈点位

### 4. 持续学习优化

- ✅ **决策追踪** - 记录所有投资建议和实际结果
- ✅ **准确率评估** - 持续评估模型准确性
- ✅ **参数优化** - 基于反馈自动调优

---

## 📊 产品方案

### 文档导航

#### 核心文档（必读）

| 文档 | 说明 | 阅读时间 |
|-----|------|---------|
| [产品重构方案](PRODUCT_RESTRUCTURE_PLAN.md) | 产品定位、市场调研、架构设计 | 15分钟 |
| [技术实现规格](TECHNICAL_SPECIFICATION.md) | 技术架构、代码实现、API设计 | 30分钟 |
| [实施路线图](IMPLEMENTATION_ROADMAP.md) | 11周开发计划、任务分解 | 20分钟 |
| [文档审查清单](DOCUMENTATION_REVIEW.md) | 实现细节、风险分析 | 15分钟 |

#### 快速索引
- 📖 [文档索引中心](DOCS_INDEX.md) - 完整的文档导航
- 📋 [产品需求文档](PRODUCT_REQUIREMENTS.md) - PRD和需求
- 🧪 [测试报告](docs/tests/TEST_REPORT_2026-02-24.md) - 测试验证报告

#### 使用指南
- 🚀 [快速开始](docs/guides/QUICK_START_GUIDE.md) - 5分钟上手
- 🔑 [API密钥配置](docs/guides/API_KEY_GUIDE.md) - API设置
- 🚀 [部署指南](docs/guides/DEPLOYMENT_GUIDE.md) - 部署说明
- ☁️ [阿里云ECS购买](docs/guides/ALIYUN_ECS_BUYING_GUIDE.md) - 服务器购买

---

## 🏗️ 技术架构

### 三层架构模型

```
        ┌─────────────────────┐
        │   决策层 (Decision)  │
        │  - 投资建议生成       │  ← 给出明确建议
        │  - 风险评估          │     (具体到股票代码)
        │  - 决策追踪          │
        ├─────────────────────┤
        │   分析层 (Analysis)  │
        │  - 新闻分析引擎       │  ← 多维度深度分析
        │  - 市场分析引擎       │     (事件+技术+资金+板块)
        │  - 综合评分系统       │
        ├─────────────────────┤
        │   数据层 (Data)      │
        │  - 新闻数据采集       │  ← 多源数据采集
        │  - 行情数据采集       │     (新闻+行情+资金+宏观)
        │  - 向量数据库         │
        └─────────────────────┘
```

### 核心算法

#### 综合评分公式
```
总分 = 新闻面(30%) + 技术面(30%) + 资金面(20%) + 板块面(20%)

其中:
- 新闻面得分 = Σ(事件重要性 × 影响力度 × 情感分数)
- 技术面得分 = 基于MACD/RSI/KDJ的综合评分
- 资金面得分 = 基于主力资金流向的评分
- 板块面得分 = 板块热度 + 轮动预期
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 20.9.0
- PostgreSQL >= 13 (可选)
- Anthropic API Key
- Tushare Token (可选)

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd political-news-assistant

# 2. 安装后端依赖
cd src/backend
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入API密钥

# 4. 启动后端
npm start

# 5. 安装前端依赖
cd src/frontend
npm install

# 6. 启动前端
npm run dev
```

### 访问应用

- 前端: http://localhost:3000
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

---

## 📈 项目进度

### 当前状态: v2.0 开发中

**已完成**:
- ✅ 产品调研和定位分析
- ✅ 技术方案设计完成
- ✅ 实施路线图制定
- ✅ 核心文档完成

**进行中**:
- ⏳ Phase 1: 数据层建设 (2周)
- ⏳ Phase 2: 决策引擎开发 (3周)
- ⏳ Phase 3: 模型优化 (4周)
- ⏳ Phase 4: 产品化 (2周)

**预计完成**: 2026-05-10

---

## 🎯 核心优势

### 与传统工具对比

| 维度 | 传统工具 | AI投资决策助手 |
|-----|---------|---------------|
| **信息筛选** | 手动搜索阅读 | AI自动过滤 |
| **分析时间** | 1-2小时 | 5分钟 |
| **决策支持** | 依赖个人判断 | AI给出明确建议 |
| **具体程度** | 只有板块方向 | 具体到股票代码 |
| **风险评估** | 定性描述 | 量化评分 |
| **历史验证** | 无 | 有准确率追踪 |

### 预期效果

- **决策准确率**: >70%
- **信息筛选时间**: 减少96% (从2小时→5分钟)
- **投资准确率**: 提升10-20个百分点

---

## 📚 文档结构

```
project-root/
├── README.md (本文件)
├── [核心文档].md (6个)
├── docs/
│   ├── archive/ (历史文档归档)
│   ├── guides/ (使用指南)
│   ├── tests/ (测试报告)
│   ├── design/ (设计文档)
│   └── prd/ (产品需求)
├── src/
│   ├── backend/ (后端代码)
│   └── frontend/ (前端代码)
└── [其他文档]
```

### 文档快速索引

- 📖 [文档索引中心](DOCS_INDEX.md) - **推荐从这里开始**
- 📋 [产品重构方案](PRODUCT_RESTRUCTURE_PLAN.md) - 了解产品定位
- 🔧 [技术实现规格](TECHNICAL_SPECIFICATION.md) - 了解技术实现
- 📅 [实施路线图](IMPLEMENTATION_ROADMAP.md) - 查看开发计划
- ✅ [文档审查清单](DOCUMENTATION_REVIEW.md) - 验证文档完整性

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 联系方式

- **项目维护**: Claude Sonnet 4.5
- **问题反馈**: GitHub Issues
- **文档更新**: 定期更新，查看Git提交记录

---

## 🙏 致谢

感谢以下开源项目的启发：

- [FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) - 金融大语言模型
- [QuantConnect LEAN](https://github.com/QuantConnect/Lean) - 算法交易引擎
- [Awesome Applied Agents for Investment](https://github.com/Sasha-Cui/Awesome-Applied-Agents-for-Investment) - 多智能体投资框架

---

**项目版本**: v2.0
**最后更新**: 2026-02-24
**文档状态**: ✅ 完整且最新
