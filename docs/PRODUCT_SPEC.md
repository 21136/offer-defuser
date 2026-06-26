# Offer拆弹专家 — 产品规格书 v2.1

> **Slogan**: 把崩溃的求职流程拆成今日可执行小事，测你的求职内耗人格  
> **实现状态**: 见 [§十一](#十一实现状态-2026-06-26) · 维护记录见 [MAINTENANCE_LOG.md](./MAINTENANCE_LOG.md)
> **产品定位**: 对标 SBTI 爆款测试架构，面向实习/秋招应届生的轻量化求职解压 Web 工具
> **技术路线**: 纯前端 SPA，零后端，零付费 API，静态一键部署

---

## 一、产品概述

### 1.1 目标人群

| 人群 | 场景 | 痛点 |
|------|------|------|
| 大二学生 | 找第一份实习 | 不知道从哪开始，简历空白焦虑 |
| 大三学生 | 暑期实习 / 秋招提前批 | 海投无反馈，自我怀疑 |
| 大四学生 | 秋招 / 春招 | 截止日期压迫感，内耗严重 |

### 1.2 核心双模块

```
┌─────────────────────────────────────────────────┐
│               Offer拆弹专家                        │
│                                                   │
│  ┌─────────────────┐  ┌─────────────────────────┐│
│  │ 模块 A           │  │ 模块 B                   ││
│  │ 求职人格测试      │  │ Offer拆解器              ││
│  │ (SBTI 同款体验)   │  │ (8步可执行行动方案)       ││
│  │                 │  │                         ││
│  │ 12题 → 4维向量   │  │ 输入岗位+截止日           ││
│  │ → 雷达图可视化   │  │ → 人格匹配话术池          ││
│  │ → 16类人格       │  │ → 随机生成8步方案         ││
│  │ → 可分享URL      │  │ → 每步「换一句」          ││
│  └─────────────────┘  └─────────────────────────┘│
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ 配套: Canvas海报 / 本地持久化 / 轻埋点 / 深链  │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.3 为什么软件工程学生做这个加分

1. **业务贴合行业** — 求职是所有计算机学生共同痛点，面试官极易共情
2. **技术设计深度** — 数据结构、打分算法、素材分层、渲染优化、可视化、埋点系统
3. **工程化完整** — 模块化拆分、静态资源分层、全量 TS 类型约束、构建优化
4. **成本控制思维** — 规避付费 API，纯客户端架构，体现工程取舍能力

### 1.4 免责声明

> ⚠️ 本测试基于娱乐化模型，仅供求职心态自嘲与参考，不构成心理或职业咨询。

此声明固定展示于 ResultPage 底部和海报底部（小字）。

---

## 二、数据层架构（三级分层素材）

### 2.1 层级 1：四维打分模型

#### 维度定义

```
┌──────────────┬──────────────────────────────────┐
│ 维度          │ 标签                             │
├──────────────┼──────────────────────────────────┤
│ D1 拖延倾向    │ 极限摆烂 / 中度内耗 / 稳步推进     │
│ D2 投递策略    │ 海投型 / 精准定向 / 佛系等待       │
│ D3 完美主义    │ 卡点冲刺 / 提前筹备 / 反复内耗修改  │
│ D4 面试心态    │ 恐惧怯场 / 适度松弛 / 自信突击     │
└──────────────┴──────────────────────────────────┘
```

#### 技术实现

```typescript
// 用户四维向量
interface ScoreVector {
  delay: number;     // D1 拖延倾向 [0, 100]
  apply: number;     // D2 投递策略 (application strategy) [0, 100]
  perfect: number;   // D3 完美主义 [0, 100]
  interview: number; // D4 面试心态 [0, 100]
}
```

每题 4 个选项，各选项对 4 个维度分别 ±N 分，12 题答完后线性归一化到 [0, 100]。

#### 归一化公式（写死，不可多实现）

```typescript
// 构建期从 questions.json 预计算各维理论最小/最大值
// 输出到 src/constants/scoreBounds.ts
const rawMin: ScoreVector; // 各维 12 题所有选项累计的最小可能值
const rawMax: ScoreVector; // 各维 12 题所有选项累计的最大可能值

function normalize(raw: ScoreVector): ScoreVector {
  return {
    delay:   clamp((raw.delay    - rawMin.delay)    / (rawMax.delay    - rawMin.delay)    * 100, 0, 100),
    apply:   clamp((raw.apply    - rawMin.apply)    / (rawMax.apply    - rawMin.apply)    * 100, 0, 100),
    perfect: clamp((raw.perfect  - rawMin.perfect)  / (rawMax.perfect  - rawMin.perfect)  * 100, 0, 100),
    interview: clamp((raw.interview - rawMin.interview) / (rawMax.interview - rawMin.interview) * 100, 0, 100),
  };
}
```

构建脚本 `scripts/genScoreBounds.ts` 从 `questions.json` 自动导出 bounds 常量。**Week 1 必须完成此脚本 + 单测**。

v1 固定 **12 题**；题量增加列入 P2 实验。

### 2.2 层级 2：16 套求职人格

| # | 人格名称 | `formalName`（面试版 P2） | 核心特征 |
|---|---------|--------------------------|---------|
| 1 | 海投摆烂吗喽 | 广泛投递型 | 高投递量、低质量、随缘心态 |
| 2 | 简历空白焦虑者 | 起步焦虑型 | 项目少、不敢投、持续焦虑 |
| 3 | JD逐条抠细节完美党 | 精准匹配型 | 一条不符就不投、简历改不停 |
| 4 | 截止日前一天突击人 | DDL驱动型 | DDL 驱动、最后一刻爆发 |
| 5 | 只投大厂宁缺毋滥型 | 目标聚焦型 | 目标明确、竞争激烈、连挂连面 |
| 6 | 广撒网随缘上岸选手 | 开放探索型 | 什么都投、不挑不拣、佛系等 Offer |
| 7 | 面试前疯狂背稿内耗型 | 过度准备型 | 准备过度、临场卡壳、反复复盘 |
| 8 | 佛系投递从不焦虑派 | 心态稳定型 | 心态稳定、投递量少、顺其自然 |
| 9 | 项目经历反复重构强迫症 | 完美迭代型 | 永远在优化项目、从不投递 |
| 10 | 只会投实习不准备秋招 | 路径单一型 | 路径单一、风险集中 |
| 11 | 面一次自闭三天 emo 型 | 挫折敏感型 | 一次失败就全盘否定自己 |
| 12 | 提前三个月长线规划党 | 计划导向型 | 计划性强、按部就班、稳定推进 |
| 13 | 只会改简历不投递拖延怪 | 行动滞后型 | 简历改了 50 版、投了 0 份 |
| 14 | 跨专业零基础迷茫选手 | 方向探索型 | 方向不明、不知从何学起 |
| 15 | 笔试狂刷面试摆烂型 | 笔强面弱型 | 笔试高分、面试裸考、差距大 |
| 16 | 手握多份 Offer 选择困难户 | 决策犹豫型 | 甜蜜的烦恼、纠结不回拒 |

`personas.json` 预留 `formalName: string` 可选字段。主站默认使用梗名 `name`；面试演示版通过 `?tone=formal` query 切换 `formalName`（P2）。

#### 人格标准向量

每类人格预设一个四维标准向量（如 `[85, 20, 70, 30]`），匹配时计算欧式距离：

```
distance = √((u.delay - p.delay)² + (u.apply - p.apply)²
            + (u.perfect - p.perfect)² + (u.interview - p.interview)²)
```

取 `min(distance)` 对应人格。

#### 分布验收（编码前）

构建脚本模拟 ≥10,000 随机答卷，输出 16 人格直方图。若任一型占比 >35% 或 <3%，调整 `personas.json` 标准向量直到分布合理。此脚本 **Week 1 完成**。

### 2.3 层级 3：分场景 × 分人格步骤话术池（方案 A）

#### 数据模型（方案 A — 全量分叉，v1 锁定）

```typescript
// 方案 A：每人格独立 8 步 × 每步 7 选项
// 方案 B（骨架+修饰）v1 不实现，仅记录为未来优化方向
interface StepLibrary {
  category: JobCategory;
  personas: Record<PersonaId, StepTemplate[]>; // 每人格 8 步，每步 7 条 option
}
```

**v1 采用方案 A**，不做方案 B。产品目标「16 种人格拆出来的方案肉眼可见差异」，全量分叉是实现此目标的唯一路径。

#### 八步语义槽位（固定，不可打乱）

步骤语义由 `position` 决定，**仅槽位内文案加权随机**，不可跨槽位随机。`JobCategory` 可覆写 `title` 措辞，但 `position` 序列不变。

| position | title | 意图 | 说明 |
|----------|-------|------|------|
| 1 | 搞清门槛 | JD 拆解 / 硬性条件 | 该岗位真正要什么 |
| 2 | 改简历 | 针对该岗改一版 | 关键词对齐 |
| 3 | 去投递 | 今天投出去 | 渠道 + 时机 |
| 4 | 笔试准备 | 客观题 / 手撕 | 按岗位类型选刷题方向 |
| 5 | 面试准备 | 项目话术 | STAR 法则 |
| 6 | 模拟练习 | 自问自答 / 录音 | 出声练 |
| 7 | 跟进复盘 | 邮件 / 内推追问 | 投后不消失 |
| 8 | 心态复位 | 防内耗收尾 | 自嘲解压句 |

#### 场景分类

| 场景 | 适用岗位 | 上线阶段 |
|------|---------|---------|
| 前端开发实习 | React、Vue、前端相关岗位 | **P0** |
| 通用互联网岗 | 后端、测试、产品、运营、数据 | **P0** |
| 国企/事业单位 | 银行科技岗、运营商、研究所 | **已上线**（原 P1，实现时三场景均已开放） |

> **实现注记 (2026-06-26)**: `P0_CATEGORIES` 已含三场景；规格原 P1 延后策略被实现超前覆盖，以代码为准。

#### 生成逻辑

```
输入: personaId, category, jobName, deadline
  ↓
daysLeft = ceil((deadline - today) / 86400000)
vars = { jobName, deadline, daysLeft, personaName, ... }
  ↓
templates = steps[category].personas[personaId]  // 固定 8 个 StepTemplate
  ↓
for i in 0..7:
  plan.steps[i] = {
    position: templates[i].position,  // 1-8 固定
    title:    templates[i].title,     // 可按 category 覆写
    content:  interpolate(weightedRandom(templates[i].options), vars)
  }

总组合数 = 16 × 7⁸ = 92,236,816 种
```

每步支持「换一句」局部重随机：**仅重随机当前槽位，其他 7 步不变**。

### 2.4 内容资产清单（并行 AI 分票依据）

| 资产 | 数量 | 说明 |
|------|------|------|
| `questions.json` | 12 题 × 4 选项 | 含分数映射 |
| `personas.json` | 16 人格 | 含标准向量 + 可选 `formalName` |
| `personaTexts.json` | 16 套解读 | 名称/优劣势/建议/标签梗 |
| `steps/frontend.json` | 16 × 8 × 7 = 896 条 | 方案 A 全量分叉 |
| `steps/general.json` | 16 × 8 × 7 = 896 条 | 同上 |
| `steps/state-owned.json` | 16 × 8 × 7 = 896 条 | P1 上线 |
| **步骤选项合计** | **2,688 条** | 主力工作量 |

并行拆分示例：
- AI-1：人格 1–4 × frontend × 8 步 × 7 条
- AI-2：人格 5–8 × general × 8 步 × 7 条
- AI-3：人格 9–12 × frontend × 8 步 × 7 条
- AI-4：人格 13–16 × general × 8 步 × 7 条

合并前所有文件须通过 JSON Schema 校验 + 重复率脚本（`npm run validate:content`），确保同槽位 7 选项语义不重复。素材生产规范详见 `docs/CONTENT_STYLE_GUIDE.md`（Week 1 创建）。

---

## 三、核心算法设计

### 3.1 欧式距离向量匹配

```
输入: 用户四维向量 userVector (已归一化)
     16 个人格标准向量 personaVectors[]

输出: 最佳匹配人格 + Top-2 混合 + 相似度

算法:
1. 归一化用户向量到 [0, 100]（见 §2.1 公式）
2. 遍历 16 个人格，计算欧式距离
3. 取最小距离对应人格 → 主结果
4. 取次小距离对应人格 → 次人格
5. 计算相似度: similarity = max(0, 1 - distance / DISTANCE_SCALE) × 100

DISTANCE_SCALE = 200（4 维各差 100 的理论最大距离，常量写死）
```

#### 分布验收

开发前用脚本模拟 ≥10k 随机答卷，输出 16 人格直方图；任一型占比 >35% 或 <3% 时调整 `personas.json` 标准向量。

#### 结果页展示

- **主结果**：最佳匹配人格全量解读
- **Top-2 混合条**：「68% 海投摆烂吗喽 + 32% 佛系投递从不焦虑派」— 传播友好的混合展示（P0）
- **雷达图**：四维可视化，用户向量 vs 主人格标准向量叠加显示

维度加权 `w1..w4` 记入 P2 可选，v1 不加权。

### 3.2 加权随机抽取

同一步骤 7 条文案配置权重，热门松弛文案权重高，小众文案权重低，避免纯均匀随机导致的碎片感。

```typescript
interface WeightedText {
  text: string;
  weight: number; // 1-10
}

function weightedRandom(texts: WeightedText[]): string {
  const total = texts.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const t of texts) {
    r -= t.weight;
    if (r <= 0) return t.text;
  }
  return texts[0].text;
}
```

### 3.3 插值模板引擎

轻量实现，无第三方依赖：

```typescript
// 支持的变量: {{jobName}} {{deadline}} {{daysLeft}} {{personaName}}
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

// 示例
interpolate("距离 {{jobName}} 截止还有 {{daysLeft}} 天，今天先____",
  { jobName: "字节前端实习", daysLeft: 7 });
// → "距离 字节前端实习 截止还有 7 天，今天先____"
```

`daysLeft` 由 `stepGenerator` 根据截止日计算后传入 vars。

---

## 四、功能清单

### P0 — 核心必做（上线即传播）

| 功能 | 描述 |
|------|------|
| **求职人格测试** | 12 题选择 → 实时四维打分 → 归一化 → 雷达图 → 人格结果页（Top-2 混合 + 解读 + 标签梗文案） |
| **Offer 拆解器** | 输入岗位名/截止日/岗位类型（P0: frontend+general）→ 8 步可执行任务 → 每步「换一句」局部刷新 |
| **`poster-result` 海报** | Canvas 9:16 竖版：人格名 + 雷达图 + 标签梗 + Slogan + 免责小字；一键下载 PNG |
| **可分享结果 URL** | `/#/result?p={personaId}&v={delay},{apply},{perfect},{interview}` — Hash 路由；`p` 必带，`v` 可选；无 `p` 则 redirect `/#/` |
| **本地持久化** | localStorage 存储测试历史、拆解历史，刷新不丢 |
| **雷达图可视化** | 四维 SVG/Canvas 雷达图，动画展示用户 vs 标准向量叠加 |

### P1 — 工程化 & 体验

| 功能 | 描述 |
|------|------|
| **`poster-plan` 海报** | 人格 + 8 步精简（每步一行，或 Top 3 摘要）；同样 9:16 竖版 |
| **全量 TS 类型约束** | 所有数据结构、接口、函数签名提前定义 |
| **Vite 分包 & 懒加载** | 静态 JSON 素材按场景按需加载，首屏 < 200KB |
| **响应式适配** | 手机 / 平板 / PC，微信 H5 打开适配 |
| **数据看板** | **本机统计**（localStorage 聚合）：测试次数、拆解次数、海报保存次数；UI 标明「本机数据，换设备不共享」 |
| **暗色模式** | 亮/暗双主题；**海报 Canvas 固定亮色主题**，不读取 `appStore.theme`，导出恒为亮色 |
| **轻量 og** | `index.html` 静态 `og:title` / `og:image`；ResultPage 动态 `document.title = 你是【{人格名}】\| Offer拆弹专家` |

### P2 — 拓展

| 功能 | 描述 |
|------|------|
| **人格图鉴页** | 16 类人格全部可预览，增加页面停留 |
| ~~**中性别名模式**~~ | **已实现** — `?tone=formal` + `getDisplayName()`，素材不翻倍 |
| **一键重置** | 清除所有本地数据 |
| **文案风格切换** | 松弛自嘲版 / 务实高效版 |

---

## 五、工程架构

### 5.1 目录结构

```
offer-defuser/
├── public/
│   └── og-default.png           # 默认 og:image
├── scripts/
│   └── genScoreBounds.ts        # 归一化常量生成（Week 1）
├── src/
│   ├── assets/                  # 静态素材库
│   │   ├── questions.json       # 12 道测试题
│   │   ├── personas.json        # 16 类人格定义 + 标准向量
│   │   ├── personaTexts.json    # 人格解读文案
│   │   └── steps/               # 拆解话术库
│   │       ├── frontend.json    # 前端开发实习 (P0)
│   │       ├── general.json     # 通用互联网岗 (P0)
│   │       └── state-owned.json # 国企/事业单位 (P1)
│   ├── constants/
│   │   └── scoreBounds.ts       # 由 genScoreBounds 脚本自动生成
│   ├── models/                  # TypeScript 类型定义
│   │   ├── score.ts             # ScoreVector, Dimension
│   │   ├── persona.ts           # Persona, PersonaMatch
│   │   ├── step.ts              # StepTask, StepLibrary
│   │   └── tracker.ts           # TrackEvent
│   ├── services/                # 核心算法层
│   │   ├── scoreCalculator.ts   # 四维打分 + 归一化
│   │   ├── personaMatcher.ts    # 欧式距离向量匹配
│   │   ├── stepGenerator.ts     # 加权随机步骤生成
│   │   └── templateEngine.ts    # {{变量}} 插值渲染
│   ├── components/              # 通用组件
│   │   ├── TestQuestion/        # 测试答题组件
│   │   ├── StepCard/            # 拆解步骤卡片
│   │   ├── RadarChart/          # 雷达图 (Canvas/SVG)
│   │   ├── ShareCanvas/         # 海报生成画布 (两套模板)
│   │   ├── PersonaResult/       # 人格结果展示 (含 Top-2 混合条)
│   │   └── ui/                  # 基础 UI 组件
│   ├── stores/                  # 状态管理 (Zustand)
│   │   ├── testStore.ts
│   │   ├── defuserStore.ts
│   │   └── appStore.ts
│   ├── utils/                   # 工具函数
│   │   ├── storage.ts           # localStorage 持久化封装
│   │   ├── tracker.ts           # 前端轻埋点 (localStorage 计数)
│   │   ├── random.ts            # 加权随机工具
│   │   └── shareUrl.ts          # 分享 URL 编码/解码
│   ├── hooks/                   # 自定义 hooks
│   ├── pages/                   # 页面入口
│   │   ├── HomePage.tsx
│   │   ├── TestPage.tsx
│   │   ├── ResultPage.tsx       # ?p=&v= query 解码 + localStorage 双路径
│   │   ├── DefuserPage.tsx      # ?persona= query → 人格带入
│   │   ├── GalleryPage.tsx      # 人格图鉴 (P2)
│   │   └── DashboardPage.tsx    # 本机数据看板
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── PRODUCT_SPEC.md          # 本文档
│   └── CONTENT_STYLE_GUIDE.md   # 素材生产规范（Week 1 创建）
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

### 5.2 路由设计

| 路径 | 页面 | Query | 说明 |
|------|------|-------|------|
| `/` | HomePage | — | 首页，双模块入口 |
| `/test` | TestPage | — | 12 题人格测试 |
| `/result` | ResultPage | `?p={personaId}&v={d1},{d2},{d3},{d4}` | 人格结果；`p` required，`v` optional |
| `/defuser` | DefuserPage | `?persona={id}` | Offer 拆解器；可选带入人格 |
| `/gallery` | GalleryPage | — | 人格图鉴 (P2) |
| `/dashboard` | DashboardPage | — | 本机数据看板 |

### 5.3 数据流

```
用户答题 → testStore (Zustand)
       ↓
  scoreCalculator (四维打分 + 归一化)
       ↓
  personaMatcher (欧式距离匹配 → 主人格 + Top-2)
       ↓
  ResultPage (展示结果 + 雷达图 + 相似度)
       ↓
  encodeShareUrl() → 复制链接 / 海报二维码
       ↓
  ── 传播裂变 ──
       ↓
  好友访问 /#/result?p=...&v=... → hash + query 解码渲染
       ↓
  DefuserPage ← personaId (query/localStorage/DEFAULT)
       ↓
  stepGenerator (加权随机生成 8 步)
       ↓
  展示 +「换一句」局部重随机
       ↓
  ShareCanvas → exportPoster('result' | 'plan') → 下载
       ↓
  tracker (localStorage 计数) + storage (持久化)
```

### 5.4 用户状态与模块串联

```
状态:
  NO_PERSONA  — 未完成测试，localStorage 无 personaId
  HAS_PERSONA — 已完成测试，localStorage 有 personaId + scoreVector

DefuserPage 入口:
  - HAS_PERSONA → 自动带入 personaId，页头展示「为【{人格名}】定制」
  - NO_PERSONA  → 允许进入（不强制拦截），使用 DEFAULT_PERSONA_ID = "resume-anxious"
                   顶部 Banner: 「测 2 分钟，拆解更准 →」链到 /test

ResultPage 出口:
  - 主 CTA: 「用这个人格拆解我的 Offer」→ /defuser?persona={id}
  - 次 CTA: 「复制结果链接」→ 复制 `/#/result?p={id}&v={vector}`
  - 三次 CTA: 「生成分享海报」→ exportPoster('result')

HomePage:
  - 两入口始终展示，不因 NO_PERSONA 隐藏拆解器
```

### 5.5 分享与深链

> **路由模式**: `HashRouter`（CloudBase 静态托管无 SPA 错误文档配置）。浏览器地址栏形态为 `https://<host>/#/result?p=...`

```
路由: GET /#/result  (React Router path 仍为 /result，hash 由 HashRouter 管理)
Query (hash 之后):
  p: string — personaId, required
  v: string — "delay,apply,perfect,interview" 四维整数 0-100, optional
  tone: optional — 'fun' | 'formal'

行为:
  - 有 p 合法 → 渲染对应人格解读 + 梗文案
  - 有 v 合法 → 渲染雷达图（用户向量 vs 标准向量叠加）
  - 无 v → 仅展示人格文本，提示「好友未分享雷达数据」
  - 缺 p 或 p 校验失败 → navigate('/') → hash 变为 #/

默认复制链接: origin + /#/result?p=...
用户可选「带雷达分享」附加 &v=
```

零后端实现：query 字符串客户端解析。编码函数 `encodeShareUrl()` 位于 `utils/shareUrl.ts`，返回 `/#/result?...`。

**E2E / 手动测试**: 须使用 `/#/path`，见 `tests/e2e/helpers.ts`。

---

## 六、技术栈

| 类别 | 选型 | 理由 |
|------|------|------|
| 框架 | React 19 | 与 llm-compare 技术栈一致 |
| 语言 | TypeScript 5.7 strict | 全量类型约束 |
| 构建 | Vite 6 | 快速 HMR + 代码分割 |
| 状态管理 | Zustand 5 | 轻量，同样用于 llm-compare |
| 样式 | Tailwind CSS 4 | 快速开发 + 响应式 |
| 路由 | React Router v7 **HashRouter** | 兼容 CloudBase 等无 SPA fallback 的静态托管 |
| 雷达图 | 自研 SVG/Canvas | 无第三方图表库依赖 |
| 海报 | Canvas API | 自研绘制，固定亮色主题 |
| 测试 | Vitest + Playwright | E2E 使用 `/#/path` 辅助函数 |
| 部署 | **CloudBase（大陆主）** + Vercel（海外镜像） | 见 `cloudbaserc.json` / `vercel.json` |

> **刻意不引入的库**: ECharts/D3 (太重), OpenAI/Any LLM SDK (付费), 后端框架 (不需要), SSR/Prerender (与零后端冲突)

---

## 七、开发计划（4 周，已按评审调整）

### Week 1 — 骨架 + 核心算法 + 数据模型定稿

- [ ] Vite + TS + React + Tailwind + Zustand 脚手架
- [ ] **R-001**: 数据模型定稿 — 方案 A 锁定，附录 `StepLibrary` 与 §2.3 统一
- [ ] 定义所有 TS 类型 (`models/`)
- [ ] 实现四维打分算法 + 归一化（含 `genScoreBounds.ts` 脚本）+ 单元测试
- [ ] 实现欧式距离向量匹配 + 分布验收脚本 (≥10k 模拟) + 单元测试
- [ ] 实现加权随机抽取 + 单元测试
- [ ] 实现模板插值引擎 + 单元测试
- [ ] 12 道测试题 JSON 准备 + ScoreBounds 常量导出
- [ ] **新建 `docs/CONTENT_STYLE_GUIDE.md`** — 多 AI 并行生产规范
- [ ] 路由 + 页面骨架

### Week 2 — 页面联调优先 + 素材并行填充

- [ ] 16 套人格标准向量定义 + `personas.json`（预留 `formalName`）
- [ ] 16 套人格解读文案 (`personaTexts.json`)
- [ ] **优先跑通** `steps/frontend.json` 全量（16 × 8 × 7）→ 联调 DefuserPage
- [ ] `steps/general.json` 并行填充
- [ ] `steps/state-owned.json` 标 P1，可延至 Week 4
- [ ] TestPage: 答题流程 + 进度条 + 动画
- [ ] ResultPage: 人格结果 + Top-2 混合条 + 雷达图 + 人格解读 + 免责声明
- [ ] DefuserPage: 输入表单 + `DEFAULT_PERSONA` fallback + 8 步结果 +「换一句」
- [ ] **R-002**: 模块串联 — NO_PERSONA Banner + ResultPage CTA
- [ ] 基础响应式适配

### Week 3 — 海报 + 分享 + 工程化

- [ ] **R-003**: 分享 URL 编码/解码 (`utils/shareUrl.ts`) + ResultPage query 渲染
- [ ] Canvas `poster-result` 海报（P0）：人格名 + 雷达 + 标签梗 + Slogan + 免责小字
- [ ] Canvas `poster-plan` 海报（P1）：人格 + 8 步精简
- [ ] ShareCanvas 组件 — 两套模板，导出 API `exportPoster(type)`
- [ ] **R-012**: 海报固定亮色，不随暗色模式
- [ ] 一键下载 PNG
- [ ] localStorage 持久化 (测试历史 + 拆解历史)
- [ ] 前端轻埋点系统（`localStorage` 计数，不上传内容）
- [ ] 暗色模式 + 全局响应式
- [ ] 动画 & 微交互

### Week 4 — 收尾 + 上线

- [ ] 补全 `steps/general.json`（若 Week 2 未完成）
- [ ] `steps/state-owned.json`（P1）+ 岗位类型第三选项解锁
- [ ] 人格图鉴页面 (P2)
- [ ] 本机数据看板页面（标注「本机数据」）
- [ ] 一键重置 + 中性别名模式 (P2)
- [ ] Vite 构建优化 (分包、静态 JSON 懒加载)
- [ ] **R-015**: Playwright E2E 三条黄金路径：
  - Path A: 答题 → 结果 → 下载 `poster-result`
  - Path B: 拆解器生成 8 步 →「换一句」→ 仅该步变化
  - Path C: 访问 `/result?p=...&v=...` → 人格与雷达正确渲染
- [ ] 首屏性能优化 (Lighthouse > 90)
- [ ] Vercel 部署
- [ ] 小红书引流文案准备

---

## 八、成本分析

| 项目 | 方案 | 成本 |
|------|------|------|
| 开发 | 个人 + 多 AI 协作 | ¥0 |
| API 调用 | 全客户端，无 API | ¥0 |
| 部署 | Vercel 免费层 | ¥0 |
| 域名 | 可选 | ~¥50/年 |
| 素材 | 自写文案 | ¥0 |
| **总计** | | **¥0-50** |

---

## 九、传播策略

### 微信分享优先级

1. **首选 — 海报长按保存**：微信生态主路径，朋友圈/群聊长按识别。海报即内容，无需跳转。
2. **次选 — 复制结果链接**：`/result?p=...` 深链，好友点击即看同一份人格结果。
3. **辅助 — 静态 og 卡片**：`index.html` 默认 `og:title` / `og:image` + ResultPage 动态 `document.title`。**不做 SSR/prerender**（与零后端原则一致）。

### 破圈路径

```
小红书 / 朋友圈发帖
    ↓
「测测你的求职内耗人格」海报截图
    ↓
好友跟测 + 二次传播
    ↓
自然裂变 (SBTI 验证过的路径)
```

### 差异化打法

- **自嘲情绪价值** — 16 类人格命名带梗（"海投摆烂吗喽""面一次自闭三天 emo 型"），年轻人自发传播
- **实用工具属性** — 不只是测试，还产出 8 步可执行方案，提升留存
- **截图即内容** — `poster-result` 海报设计适配小红书 9:16 竖版，带免责小字，降低用户分享门槛

---

## 十、与 llm-compare 的差异化

| 维度 | llm-compare | Offer拆弹专家 |
|------|-----------|--------------|
| 定位 | 开发者效率工具 | 应届生求职解压 |
| 用户群 | 开发者/技术向 | 泛大学生/大众向 |
| 传播性 | 低（工具属性） | 高（社交测试属性） |
| 技术重点 | SSE 流式 + 编辑器集成 | 向量匹配 + 分层素材架构 |
| 产品形态 | 重度工具 | 轻量快消 + 社交裂变 |
| 面试叙事 | React 工程化能力 | 算法设计 + 架构取舍 + 产品思维 |
| 流量预期 | 低（SEO 长尾） | 中-高（社交裂变） |

两个项目互补，一个走技术深度路线，一个走产品+传播路线。

---

## 附录：关键 TS 类型速查

```typescript
// === 打分 ===
interface Dimension {
  key: 'delay' | 'apply' | 'perfect' | 'interview';
  label: string;
  min: number;  // 0
  max: number;  // 100
}

interface ScoreVector {
  delay: number;     // D1 拖延倾向
  apply: number;     // D2 投递策略 (application strategy)
  perfect: number;   // D3 完美主义
  interview: number; // D4 面试心态
}

// === 归一化常量（由 genScoreBounds.ts 自动生成）===
// src/constants/scoreBounds.ts
interface ScoreBounds {
  rawMin: ScoreVector;
  rawMax: ScoreVector;
}

// === 题目 ===
interface QuestionOption {
  text: string;
  scores: Partial<ScoreVector>; // 该选项在各维度的加减分
}

interface Question {
  id: number;
  text: string;
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
}

// === 人格 ===
type PersonaId = string; // e.g. "mass-applyer"

interface Persona {
  id: PersonaId;
  name: string;            // 梗名: "海投摆烂吗喽"
  formalName?: string;     // 中性别名 P2: "广泛投递型"
  vector: ScoreVector;     // 标准四维向量
  tags: string[];          // ["海投", "佛系", "随缘"]
  description: string;     // 人格解读
  strengths: string[];
  weaknesses: string[];
  advice: string;          // 一句话建议
}

interface PersonaMatch {
  persona: Persona;            // 主匹配人格
  distance: number;            // 欧式距离
  similarity: number;          // max(0, 1 - distance/200) × 100
  subPersona: Persona;         // 次匹配人格
  subSimilarity: number;       // 次人格相似度
  top3: Persona[];             // Top-3 人格（含主）
}

// === 拆解步骤 ===
interface StepOption {
  text: string;            // 支持 {{jobName}} {{deadline}} {{daysLeft}} {{personaName}}
  weight: number;          // 1-10
}

interface StepTemplate {
  position: number;        // 1-8 固定语义槽位
  title: string;           // 步骤标题（可按 JobCategory 覆写）
  options: StepOption[];   // 7 条备选文案
}

// === 场景 ===
type JobCategory = 'frontend' | 'general' | 'state-owned';

// 方案 A：全量分叉（v1 锁定）
interface StepLibrary {
  category: JobCategory;
  personas: Record<PersonaId, StepTemplate[]>; // 每人格 8 步 × 每步 7 选项
}

// === 生成的拆解方案 ===
interface DefusePlan {
  id: string;
  personaId: PersonaId;
  category: JobCategory;
  jobName: string;
  deadline: string;       // ISO date
  daysLeft: number;       // 计算得出
  steps: DefuseStep[];
  createdAt: string;
}

interface DefuseStep {
  position: number;   // 1-8 固定
  title: string;
  content: string;    // 已插值渲染的最终文案
}

// === 分享 URL (HashRouter) ===
// /#/result?p={personaId}&v={delay},{apply},{perfect},{interview}
interface ShareParams {
  p: PersonaId;                    // required
  v?: [number, number, number, number]; // optional, 0-100
}

// === 埋点事件 ===
interface TrackEvent {
  event: 'page_view' | 'test_complete' | 'defuse_generate' | 'poster_download' | 'link_copy';
  timestamp: string;
  meta?: Record<string, string>;
}
// 存储: localStorage key = "offer-defuser:tracking"
// 数据仅本机，不上传；Dashboard 标明「本机统计」
```

---

## 十一、实现状态 (2026-06-26)

> 对照 Week 4 收尾与交叉验证合入清单。详细维护操作见 [MAINTENANCE_LOG.md](./MAINTENANCE_LOG.md)。

### 功能完成度

| 类别 | 项 | 状态 | 备注 |
|------|-----|------|------|
| P0 | 12 题测试 + 雷达 + Top-2 | ✅ | |
| P0 | Offer 拆解器 8 步 | ✅ | 三场景均已上线 |
| P0 | poster-result | ✅ | |
| P0 | 分享 URL | ✅ | Hash 格式 `/#/result?p=` |
| P0 | localStorage 持久化 | ✅ | |
| P1 | poster-plan | ✅ | |
| P1 | 暗色模式 + 海报固定亮色 | ✅ | |
| P1 | 本机看板 | ✅ | |
| P1 | SEO meta / robots / sitemap | ✅ | og-image.png 仍缺 |
| P2 | 人格图鉴 | ✅ | |
| P2 | `?tone=formal` 中性别名 | ✅ | 原标 P2，已提前实现 |
| P2 | 一键重置 | ✅ | Dashboard |
| P2 | 文案 style 切换 UI | ⚠️ 壳子 | serious 专属文案未填充 |
| 内容 | 2688 条步骤文案 | ✅ | validate:content 通过 |
| 测试 | Vitest | ✅ | 50/50 |
| 测试 | Playwright E2E | ✅ | 2026-06-26 适配 HashRouter |
| 部署 | CloudBase | ✅ | 大陆主站 |
| 部署 | Vercel | ✅ | 海外镜像 |
| 工程 | Git 初始化 | ❌ | 见 BACKLOG |

### 线上地址

- 大陆: `https://my-dev-env-d5gmbgs48b69f67ba-1446340184.tcloudbaseapp.com`
- 海外: `https://offer-defuser.vercel.app`

### 文档体系

| 文档 | 状态 |
|------|------|
| README.md | ✅ 2026-06-26 新建 |
| PRODUCT_SPEC v2.1 | ✅ 本文件 |
| MAINTENANCE_LOG | ✅ 审计追踪 |
| CONTENT_STYLE_GUIDE | ✅ |
| CLAUDE.md | ✅ AI 协作地图 |
| CROSS_VALIDATION 合入清单 | ✅ 已勾销 |
