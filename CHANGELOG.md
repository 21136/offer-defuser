# 改动记录

> 记录此项目之后的所有改动。每次改动一条，格式：日期 + 做了什么 + 影响范围。  
> **维护性工作**（文档同步、测试修复等）详见 [docs/MAINTENANCE_LOG.md](docs/MAINTENANCE_LOG.md)。

---

## 2026-06-26 — 修复人格匹配度显示

**"人格混合度"改为"人格匹配度"，条形图从叠加改为两条独立。**

### 问题
- 两个相似度独立计算（各自 0-100%），sum 常 >100%
- 叠加条形图 + "混合度"标签误导用户以为应合计 100%

### 修复
- `src/pages/ResultPage.tsx`: 标签改为"人格匹配度"，bar 拆为两条独立进度条（蓝/灰）
- 4 份 spec 文档术语同步：Top-2 混合 → Top-2 匹配

---

## 2026-06-26 — P2 隐私友好分析（Umami）

**接入 Umami Analytics，零 cookie 的服务端统计数据。**

### 设计决策
- **选 Umami 而非 Plausible** — Umami Cloud 免费 tier（100K events/月，3 网站），Plausible Cloud 最低 €9/月
- 两者均为开源、可自部署，后续迁移成本低

### 实现
- `src/utils/analytics.ts` — Umami 脚本注入 + `trackUmami()` 封装
- `src/models/umami.d.ts` — `window.umami` 类型声明
- `src/utils/tracker.ts` — `track()` 内桥接 Umami（7 种事件自动上报）
- `src/main.tsx` — 应用启动时调用 `initAnalytics()`
- `.env.example` — 接入说明 + 配置模板

### 行为
- 设置 `VITE_UMAMI_WEBSITE_ID` → 生产环境自动加载脚本，PV + 自定义事件上报
- 不设置（本地开发）→ 静默跳过，零开销
- 支持 `VITE_UMAMI_SCRIPT_URL` 指向自部署实例

### 验证
- `npm run build` — ✅ 通过
- `npm run test:run` — ✅ 50/50 通过

### 影响范围
- 新增: `src/utils/analytics.ts`; `src/models/umami.d.ts`; `.env.example`
- 修改: `src/utils/tracker.ts`; `src/main.tsx`

---

## 2026-06-26 — P0 严肃风格内容填充

**frontend.json 新增 380 条「务实高效」文案，风格切换从摆设变为可用。**

### 内容
- `src/assets/steps/frontend.json` — 896 条 casual 补 `style: "casual"` + 新增 380 条 `style: "serious"`（16 人格 × 8 步 × 2-3 条）
- 现有 casual 文案全部标注 style 标签，serious 模式不再 fallback 到混合池

### 工具脚本
- 新建 `scripts/addCasualStyle.ts` — 批量为现有选项添加 style 标签
- 新建 `scripts/mergeSeriousContent.ts` — 合并 serious 临时文件到主 JSON
- 新建 `scripts/fixMissingVars.ts` — 修复缺失模板变量的选项

### 工程
- `scripts/validateContent.ts` — 选项数检查从严格 7 改为 7-10 区间

### 验证
- `npm run validate:content` — 0 errors, 0 warnings
- `npm run test:run` — 50/50 通过

### 影响范围
- `src/assets/steps/frontend.json`；`scripts/validateContent.ts`
- 新增: `scripts/addCasualStyle.ts`；`scripts/mergeSeriousContent.ts`；`scripts/fixMissingVars.ts`

---

## 2026-06-26 — 文档收尾 + E2E 适配 HashRouter

**可追踪维护会话**（完整清单见 `docs/MAINTENANCE_LOG.md`）

### 文档
- 新建 `README.md` — 线上地址、命令、文档索引
- 新建 `docs/MAINTENANCE_LOG.md` — 维护审计日志
- `PRODUCT_SPEC.md` → v2.1：§十一实现状态、Hash 路由、双部署、国企三场景已上线
- `PRODUCT_SPEC_CROSS_VALIDATION.md` → v1.1：合入清单全部勾销
- `CLAUDE.md`：HashRouter 路由表 + E2E helpers 说明
- `CONTENT_STYLE_GUIDE.md`：§七 `style` 字段与完成度
- `BACKLOG.md`：E2E HashRouter 项完成

### 工程
- `index.html`：canonical / og:url / og:image 指向 CloudBase 主站
- 新增 `tests/e2e/helpers.ts`（`hashRoute`、`waitForHashRoute`、`clearAppStorage`）
- 修复 `full-flow` / `share-url` / `defuser` E2E 套件适配 `/#/path`

### 验证
- `npm run test:run` — **50/50 通过**
- `npm run test:e2e` — **12/12 通过**

---

## 2026-06-26 — Week 4 收尾

**Vercel 部署 + Lighthouse 优化 + P2 收尾**

### Vercel 部署
- 部署至 https://offer-defuser.vercel.app（my-demo/offer-defuser）
- `vercel.json` 已有 SPA rewrites + 安全响应头

### Lighthouse 优化（四项满分 100）
- **SEO**: 补全 OG/Twitter Card/canonical/theme-color meta；创建 robots.txt + sitemap.xml + favicon.svg
- **Performance**: TestPage 改 lazy loading；questions.json 按需加载；vite build.target es2020；移除未加载字体
- **Accessibility**: skip-to-content 链接；所有 main 加 id；Progress 组件 + aria-label；aria-pressed；修复标题层级
- **CSS**: prefers-color-scheme: dark 消除暗色模式闪白

### P2 功能
- **中性别名模式**: `getDisplayName()` + `?tone=` URL 参数 + 页面切换按钮
- **一键重置**: Dashboard 清除按钮改为 `storage.clearAll()`
- **文案风格切换**: StepOption.style 字段 + styleMode 过滤 + DefuserPage 切换按钮

### 影响范围
- 所有页面文件（6 个 pages）；App.tsx；index.html；index.css；vite.config.ts
- 模型: step.ts（StepOption.style）；服务: stepGenerator.ts；store: appStore.ts, defuserStore.ts
- 新增: utils/displayName.ts；public/favicon.svg；public/robots.txt；public/sitemap.xml

---

## 2026-06-26 — Bug 修复

**拆解方案海报：人格名称与岗位信息行间距过小导致重叠**

- `ShareCanvas.tsx` `drawPlanPoster()` — 人格名（42px）与岗位+倒计时（22px）间距 `y += 20` → `y += 54`
- 影响范围: `src/components/ShareCanvas/ShareCanvas.tsx` 第 365 行

---

## 2026-06-26 — CloudBase 国内部署

**从 Vercel 切换到腾讯云 CloudBase 静态托管**

- Vercel 在大陆无法访问 → 部署至 CloudBase 环境 `my-dev-env-d5gmbgs48b69f67ba`
- 地址: https://my-dev-env-d5gmbgs48b69f67ba-1446340184.tcloudbaseapp.com
- 新增 `cloudbaserc.json`（框架部署配置，SPA 模式）
- 上传 18 个构建产物文件，包含 `404.html` 作为 SPA fallback
- **手动步骤**: CloudBase 体验版无错误文档配置入口 → `BrowserRouter` 改为 `HashRouter`
- `App.tsx`: `BrowserRouter` → `HashRouter`；`shareUrl.ts`: 分享链接路径适配 Hash 路由
- SPA 子路由无需服务端配置即可正常工作
- 影响范围: 新增 `cloudbaserc.json`；`dist/404.html`；`App.tsx`；`shareUrl.ts`
