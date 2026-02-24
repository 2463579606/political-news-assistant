# 🔄 工作流程规范

**版本**: v1.0
**生效日期**: 2026-02-24
**适用范围**: 全体开发工作

---

## 📋 环境定义

### 环境划分

| 环境 | 说明 | 用途 | 部署位置 |
|-----|------|------|---------|
| **本地环境** | = 测试环境 | 开发、自测 | 开发者电脑 |
| **生产环境** | 云服务器 | 正式运行 | 阿里云ECS |

**重要原则**:
- 本地环境即测试环境，所有测试在本地完成
- 只有验收通过后才部署到生产环境
- 严禁直接在生产环境开发和测试

---

## 🔄 产品开发流程

### 完整流程图

```
需求提出 → 需求分析 → 需求评审 → 开发设计 → 开发 → 功能测试 → bug修复 → 回归测试 → 用户验收 → 上线生产
   ↑         ↓                                                     ↓
   └──────────────────────────────── 不通过 ←──────────────────────┘
```

### 流程详解

#### 1️⃣ 需求提出 (Requirement Proposal)
- **责任人**: 用户/产品经理
- **产出**: 需求描述（可以是口头或文字）
- **内容**: 问题描述、期望结果、优先级

#### 2️⃣ 需求分析 (Requirement Analysis)
- **责任人**: 技术负责人
- **产出**: 需求分析文档
- **内容**:
  - 需求理解确认
  - 技术可行性评估
  - 工作量评估
  - 风险识别
  - 依赖关系

#### 3️⃣ 需求评审 (Requirement Review)
- **参与人**: 用户 + 技术负责人
- **形式**: 会议或文档评审
- **产出**:
  - ✅ 评审通过 - 进入开发设计
  - ❌ 评审不通过 - 返回需求提出
- **确认内容**:
  - 需求理解是否正确
  - 技术方案是否可行
  - 工作量是否合理
  - 优先级是否正确

#### 4️⃣ 开发设计 (Development Design)
- **责任人**: 技术负责人
- **产出**: 设计文档（如果是大功能）
- **内容**:
  - 技术方案设计
  - 接口设计
  - 数据库设计（如需要）
  - 代码结构
  - 测试计划

#### 5️⃣ 开发 (Development)
- **责任人**: 开发工程师
- **分支**: `feature/xxx`
- **产出**: 功能代码 + 单元测试
- **规范**:
  - 遵循代码规范
  - 编写单元测试
  - 代码自测通过
  - 提交信息规范

#### 6️⃣ 功能测试 (Functional Testing)
- **责任人**: 开发工程师
- **环境**: 本地环境
- **产出**: 测试通过
- **内容**:
  - 单元测试
  - 集成测试
  - 手动功能测试
  - 边界条件测试

#### 7️⃣ bug修复 (Bug Fixing)
- **责任人**: 开发工程师
- **触发**: 功能测试发现问题
- **分支**: `feature/xxx` (继续在同一分支修复)
- **产出**: bug修复 + 验证通过

#### 8️⃣ 回归测试 (Regression Testing)
- **责任人**: 开发工程师
- **环境**: 本地环境
- **内容**:
  - 重新测试所有功能
  - 确保修复未引入新问题
  - 测试相关联的功能

#### 9️⃣ 用户验收 (User Acceptance)
- **责任人**: 用户
- **环境**: 本地环境（用户可以查看）
- **形式**:
  - 用户实际操作
  - 演示功能
  - 确认需求满足
- **结果**:
  - ✅ 验收通过 - 进入上线
  - ❌ 验收不通过 - 返回开发/需求分析

#### 🔟 上线生产 (Deploy to Production)
- **责任人**: 技术负责人
- **分支**: `release/xxx` → `master`
- **前提**: 用户验收通过
- **步骤**:
  1. 合并到 `master` 分支
  2. 打tag
  3. 部署到云服务器
  4. 生产环境验证
  5. 通知用户

---

## 🌿 Git分支管理

### 分支模型

采用 Git Flow 分支模型：

```
master (生产环境)
  ↑
release (发布准备)
  ↑
develop (开发主分支)
  ↑
feature (功能开发)
hotfix (紧急修复)
```

### 分支说明

#### 1. master 分支
- **用途**: 生产环境代码
- **保护**: 受保护，不允许直接push
- **状态**: 始终可部署
- **合并**: 只接受来自 `release` 和 `hotfix` 的合并
- **tag**: 每次合并打版本tag (v1.0.0, v1.0.1, etc.)

#### 2. develop 分支
- **用途**: 开发主分支
- **状态**: 包含最新开发功能
- **合并**: 接受来自 `feature` 的合并
- **起点**: 从 `master` 创建

#### 3. feature 分支
- **命名**: `feature/功能名称`
- **起点**: 从 `develop` 创建
- **生命周期**: 短期，功能完成后合并回 `develop` 并删除
- **示例**:
  - `feature/news-analyzer`
  - `feature/technical-indicators`
  - `feature/decision-engine`

#### 4. release 分支
- **命名**: `release/v版本号`
- **起点**: 从 `develop` 创建
- **用途**: 发布准备（测试、修复、文档）
- **生命周期**: 中期，发布后合并到 `master` 和 `develop` 并删除
- **示例**:
  - `release/v2.0.0`
  - `release/v2.1.0`

#### 5. hotfix 分支
- **命名**: `hotfix/问题描述`
- **起点**: 从 `master` 创建
- **用途**: 生产环境紧急修复
- **生命周期**: 短期，修复后合并到 `master` 和 `develop` 并删除
- **示例**:
  - `hotfix/critical-bug`
  - `hotfix/security-fix`

### 工作流程示例

#### 新功能开发
```bash
# 1. 从develop创建feature分支
git checkout develop
git pull origin develop
git checkout -b feature/news-analyzer

# 2. 开发并提交
git add .
git commit -m "feat: 添加新闻分析器"
git push origin feature/news-analyzer

# 3. 完成后合并回develop
git checkout develop
git merge --no-ff feature/news-analyzer
git push origin develop
git branch -d feature/news-analyzer
```

#### 版本发布
```bash
# 1. 从develop创建release分支
git checkout develop
git pull origin develop
git checkout -b release/v2.0.0

# 2. 发布准备（修复bug、更新版本号、更新文档）
# ... 完成后 ...

# 3. 合并到master并打tag
git checkout master
git merge --no-ff release/v2.0.0
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin master --tags

# 4. 合并回develop
git checkout develop
git merge --no-ff release/v2.0.0
git push origin develop

# 5. 删除release分支
git branch -d release/v2.0.0
```

#### 紧急修复
```bash
# 1. 从master创建hotfix分支
git checkout master
git pull origin master
git checkout -b hotfix/critical-bug

# 2. 修复并提交
git add .
git commit -m "fix: 修复严重bug"
git push origin hotfix/critical-bug

# 3. 合并到master并打tag
git checkout master
git merge --no-ff hotfix/critical-bug
git tag -a v2.0.1 -m "Hotfix v2.0.1"
git push origin master --tags

# 4. 合并回develop
git checkout develop
git merge --no-ff hotfix/critical-bug
git push origin develop

# 5. 删除hotfix分支
git branch -d hotfix/critical-bug
```

### 提交信息规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:
```bash
feat(news): 添加新闻事件提取器

- 实现基于Claude API的事件提取
- 添加事件重要性评分
- 实现情感分析

Closes #123
```

---

## 📦 Git仓库配置

### 需要提供的信息

#### GitHub / GitLab / Gitee 仓库信息

**必需信息**:

1. **仓库URL** (以下任一):
   - HTTPS: `https://github.com/username/repo.git`
   - SSH: `git@github.com:username/repo.git`

2. **平台信息**:
   - 平台名称: GitHub / GitLab / Gitee / 其他
   - 仓库所有者: 用户名或组织名
   - 仓库名称: `political-news-assistant`

3. **访问凭证** (根据需要):
   - **HTTPS方式**: Personal Access Token (PAT)
   - **SSH方式**: SSH公钥配置

4. **分支保护规则** (建议配置):
   - `master` 分支:
     - ❌ 禁止直接push
     - ✅ 要求PR review
     - ✅ 要求CI通过
     - ✅ 要求分支是最新的

**完整示例**:
```
平台: GitHub
URL: https://github.com/jiangyz/political-news-assistant.git
主分支: master
开发分支: develop
访问方式: HTTPS
Token: ghp_xxxxxxxxxxxxxxxxxxxx
```

### 初始化步骤

**如果已有远程仓库**:
```bash
# 添加远程仓库
git remote add origin https://github.com/username/repo.git

# 验证
git remote -v

# 推送现有内容
git branch -M main  # 如果需要重命名
git push -u origin main
```

**如果需要创建新仓库**:
```bash
# 1. 在GitHub/GitLab上创建空仓库（不初始化README）

# 2. 本地初始化
git init

# 3. 添加所有文件
git add .
git commit -m "chore: 初始化项目"

# 4. 创建主分支
git branch -M main  # 或 master

# 5. 关联远程仓库
git remote add origin https://github.com/username/repo.git

# 6. 推送
git push -u origin main
```

### 首次分支设置

**设置develop分支**:
```bash
# 从main/master创建develop
git checkout -b develop

# 推送到远程
git push -u origin develop

# 设置为默认分支（可选）
# 在GitHub设置中将default branch改为develop
```

---

## ✅ 检查清单

### 开发前检查
- [ ] 需求已经过评审
- [ ] 设计文档已完成（如需要）
- [ ] 从 `develop` 创建 `feature` 分支
- [ ] 了解相关代码规范

### 提交前检查
- [ ] 代码自测通过
- [ ] 单元测试通过
- [ ] 提交信息符合规范
- [ ] 代码已格式化

### 合并前检查
- [ ] 功能测试通过
- [ ] 回归测试通过
- [ ] 代码已review（如需要）
- [ ] 文档已更新

### 上线前检查
- [ ] 用户已验收
- [ ] 版本号已更新
- [ ] CHANGELOG已更新
- [ ] 数据库迁移已准备（如需要）
- [ ] 回滚方案已准备

---

## 📌 重要原则

### 三个严禁
1. **严禁**在生产环境直接开发和测试
2. **严禁**未经用户验收直接上线
3. **严禁**跳过流程直接修改master分支

### 三个必须
1. **必须**在本地完成所有测试
2. **必须**经过用户验收才能上线
3. **必须**遵循Git Flow分支模型

### 三个确保
1. **确保**master分支始终可部署
2. **确保**每个功能都有测试
3. **确保**所有变更都有记录

---

## 📞 联系方式

- **流程制定**: 用户
- **技术负责**: Claude Sonnet 4.5
- **生效日期**: 2026-02-24
- **最后更新**: 2026-02-24

---

**文档版本**: v1.0
**状态**: ✅ 生效中
