# Offer拆弹专家 — AI 协作指南

## Senior Engineer Workflow（全局强制）

写代码或改文件前，必须按任务类型执行对应 skill。**写文件前一句话说明当前阶段。**

### 任务路由

| 场景 | 必须先做 |
|------|---------|
| 新功能 / 大改 | project-explore → 实现 → test-engineer → code-review |
| 修 bug | debugger（复现+根因）→ 修复 → test-engineer |
| 收尾 | code-simplifier |
| 涉安全 | security-review |

### 核心规则

- **写文件前说阶段** — "现在是 [X] 阶段，我要做 [Y]"
- **禁止跳过 explore/debug 偷偷大改** — 仅 trivial 小改（单行 fix/改文案）可省略
- **每阶段结束停下来** — 等用户确认后再进下一阶段，不自动连环执行

## 项目速查

| 项目 | 路径 |
|------|------|
| 产品规格 | `docs/PRODUCT_SPEC.md` |
| 维护审计 | `docs/MAINTENANCE_LOG.md` |
| 参考项目 | `C:\Users\21136\llm-compare`（同技术栈） |
| 技术栈 | React 19 + TS 5.7 strict + Vite 6 + Zustand 5 + Tailwind 4 + React Router v7 |
| 测试 | Vitest + jsdom + RTL (unit) / Playwright (e2e) |

## 🗺️ 项目地图（完整架构一览）

### 路由表（HashRouter）

> 浏览器 URL 形态: `https://<host>/#/<path>?query` — 分享与 E2E 须带 `/#` 前缀。

| 路由 (Router path) | 页面 | 说明 |
|------|------|------|
| `/` | `HomePage` | 首页，展示 16 人格入口 + 两个 CTA（开始测试 / 直接拆解） |
| `/test` | `TestPage` | 12 题问答，逐题展示，带进度条 + localStorage 断点续答 |
| `/result?p={id}&v={vector}` | `ResultPage` | 人格结果页；分享链 `/#/result?p=...` |
| `/defuser?persona={id}` | `DefuserPage` | 拆解器：输入岗位+截止日+类型 → 8 步方案 |
| `/gallery` | `GalleryPage` | 16 人格一览 |
| `/dashboard` | `DashboardPage` | 本机统计面板 |
| `*` | → 重定向 `/` | 404 catch-all |

**E2E**: `tests/e2e/helpers.ts` — `hashRoute('/test')` → `/#/test`

### 数据流（文本内容 → 用户看到的全过程）

```
src/assets/                      ← 🗂️ 静态文本资产（~13,500 行中文）
  ├── questions.json             ← 12 题 × 4 选项，每题带 scores 向量
  ├── personas.json              ← 16 人格定义：名称/向量/解读/优劣势/建议
  ├── personaTexts.json          ← 海报卡片简版文案
  └── steps/                     ← 拆解话术库（方案 A 全量分叉）
      ├── frontend.json          ← 16 人格 × 8 步 × 7 文案 = 896 条
      ├── general.json           ← 16 人格 × 8 步 × 7 文案 = 896 条
      └── state-owned.json       ← 16 人格 × 8 步 × 7 文案 = 896 条
                                  ← 总计 2688 条步骤选项，9,200 万种组合

src/services/                    ← 🔧 纯函数算法（无副作用，100% 可单元测试）
  ├── scoreCalculator.ts         ← 12 题 answers → 四维向量 [delay, apply, perfect, interview]
  ├── personaMatcher.ts          ← 用户向量 vs 16 人格向量 → 欧式距离 → Top-2 混合
  ├── stepGenerator.ts           ← 人格+场景 → 从 7 条选项中加权随机抽 1 条
  ├── templateEngine.ts          ← `{{jobName}}` / `{{personaName}}` 模板变量替换
  └── weightedRandom.ts          ← 权重数组 → 加权随机索引

src/stores/                      ← 🏪 Zustand 状态管理
  ├── testStore.ts               ← 答题状态：answers[], currentIndex, scoreVector, personaMatch, status
  ├── defuserStore.ts            ← 拆解状态：jobName, deadline, category, personaId, currentPlan, styleMode
  └── appStore.ts                ← 全局状态：theme, toneMode ('fun'/'formal')

src/pages/                       ← 📄 路由页面（详见路由表）
src/components/                  ← 🧩 可复用组件
  ├── RadarChart.tsx             ← Canvas 四维雷达图（用户 vs 人格向量对比）
  ├── ShareCanvas.tsx            ← Canvas 海报生成器（双模板：result/plan）
  └── ui/                        ← 基础 UI 组件
      ├── Button.tsx, Badge.tsx, Card.tsx, Progress.tsx
```

### 页面 ↔ 文本资产对应关系

| 页面 | 加载的资产 | 展示方式 |
|------|-----------|----------|
| `TestPage` | `questions.json` (lazy load) | 逐题展示，每次 1 题 × 4 选项 |
| `ResultPage` | `personas.json` | 人格名 + 标签 + 解读(150-200字) + 3优势 + 3短板 + 建议 |
| `DefuserPage` | `steps/{category}.json` (lazy import) | 生成后展示 8 步，每步从 7 条中抽 1 条显示 |
| `GalleryPage` | `personas.json` | 16 张卡片，每张仅显示人名+标签 |
| `HomePage` | 无静态文本资产 | 硬编码的 CTA 文案 |
| `DashboardPage` | 无 | 纯数据展示（tracking 计数） |

### 组件树

```
App (Router + Suspense)
├── HomePage
│   ├── Card (16 人格入口)
│   └── Button (CTA: 开始测试 / 直接拆解)
├── TestPage
│   ├── Progress (进度条: 1-12)
│   ├── 题目文本 + 4 选项按钮
│   └── Button (上一题 / 下一题)
├── ResultPage
│   ├── RadarChart (四维雷达图)
│   ├── 人格解读区 (description/strengths/weaknesses/advice)
│   ├── ShareCanvas [type=result]
│   └── Button (去拆解 / 复制链接 / 重新测试)
├── DefuserPage
│   ├── 表单 (岗位名/截止日/类型选择/风格切换)
│   ├── 8-step 卡片列表 (标题 + 文案 + 换一句按钮)
│   └── ShareCanvas [type=plan]
├── GalleryPage
│   └── 16 × Card (人格名 + 标签 + hover「查看 →」)
└── DashboardPage
    └── 统计数字 (localStorage 计数)
```

### 文件用途速查

| 文件 | 职责 | 依赖级别 |
|------|------|----------|
| `src/models/persona.ts` | Persona/PersonaText 类型 | 基础 |
| `src/models/question.ts` | Question/Option/Answer 类型 | 基础 |
| `src/models/score.ts` | ScoreVector/Dimensions 类型 | 基础 |
| `src/models/step.ts` | StepLibrary/StepOption/Step/Plan 类型 | 基础 |
| `src/models/share.ts` | ShareParams 类型 | 基础 |
| `src/services/scoreCalculator.ts` | 累加 12 题得分向量 | 核心算法 |
| `src/services/personaMatcher.ts` | 欧式距离匹配 + 相似度% | 核心算法 |
| `src/services/stepGenerator.ts` | 人格+场景→8步文案生成 | 核心算法 |
| `src/services/templateEngine.ts` | `{{variable}}` 替换 | 工具 |
| `src/services/weightedRandom.ts` | 加权随机抽取 | 工具 |
| `src/stores/testStore.ts` | 答题全流程状态 | 状态 |
| `src/stores/defuserStore.ts` | 拆解器全流程状态 | 状态 |
| `src/stores/appStore.ts` | theme + toneMode | 全局状态 |
| `src/utils/shareUrl.ts` | encode/decode 分享 URL | 工具 |
| `src/utils/displayName.ts` | getDisplayName(persona, tone) | 工具 |
| `src/utils/tracker.ts` | 自研轻埋点 (localStorage 计数) | 工具 |
| `src/utils/storage.ts` | localStorage 键名 + clearAll | 工具 |
| `src/constants/scoreBounds.ts` | 四维分数上下界 | 配置 |
| `scripts/genScoreBounds.ts` | 生成 scoreBounds.ts 的脚本 | 维护工具 |

### 关键数字

- **16 人格** × **3 场景** × **8 步骤** × **7 条选项文案** = **2,688 条**步骤选项
- 12 题 × 4 选项 = 48 条测试文案
- 16 人格 × 5 文本字段（解读+3优势+3短板+建议+tagline）= 80 段人格文案
- 理论组合数：**9,200 万种**（用户不重复遇到完全相同 8 步方案的概率极高）
- Lighthouse 四项满分：Performance/Accessibility/Best Practices/SEO = **100/100/100/100**

## 已知 Bug 修复记录

| 日期 | Bug | 根因 | 修复 |
|------|-----|------|------|
| 2026-06-26 | 点击"重新测试"按钮不生效，页面闪回结果页 | `navigate('/test')` 时 store 中 `status` 仍为 `'completed'`，TestPage 的 useEffect 检测到后立即重定向回 `/result` | ResultPage: 跳转前先 `resetTest()`；TestPage: 挂载时自动检测 `completed` 状态并重置 |

## 已知限制

- **分布验收**: 10,000 随机答卷模拟中，5/16 人格略低于 3%（最低 1.3%，最高 15.2%）。随机答案天然集聚在均值附近，真实用户会按个性选择选项，分布预期更均匀。后续可根据真实用户数据调优。

## 关键设计决策（不可推倒）

- 类型目录用 `src/models/`（非 `types/`），与 PRODUCT_SPEC 一致
- 拆解话术库用方案 A（全量分叉），不做骨架+修饰
- v1 12 道测试题，不增减
- 人格匹配用欧式距离，不加权
- 海报 Canvas 固定亮色主题
