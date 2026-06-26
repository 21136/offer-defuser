# 待办清单

> 记录需要改动的地方。完成后移到 CHANGELOG.md 并从此文件删除。  
> 维护会话审计见 [docs/MAINTENANCE_LOG.md](docs/MAINTENANCE_LOG.md)。

---

## 🎯 短期优先（ROI 排序）

> 2026-06-26 评审建议 — 三项投入产出比最高的收尾事项

### P0: 严肃风格内容填充（frontend 场景优先） ✅ 2026-06-26

- [x] 为 `src/assets/steps/frontend.json` 中 16 人格 × 8 步，每步新增 2-3 条 `"style": "serious"` 文案（380 条）
- [x] 现有 896 条 casual 文案补 `"style": "casual"` 标签，避免 serious 切换时混入 casual
- [x] 验证 style 切换时 serious 模式有可见差异（filterByStyle 正确分离两类文案）
- [x] `validate:content` 更新为接受 7-10 条/步（原硬编码 7 条）
- [x] 10 条缺失 `{{variable}}` 的 serious 文案已修复
- [x] 全部 50 个单元测试通过
- [ ] general.json 和 state-owned.json 的 serious 文案可后续分批追加

**Why**: 风格切换（😄 松弛自嘲 / 💼 务实高效）已上线但功能对用户不可见——serious 模式没有专属文案，只能 fallback 到全部选项。本质是一个对用户可见的功能缺口，应优先于工程基建修复。

### P1: Git 初始化 + 推送到 GitHub

- [ ] `git init` + `git add .` + 初始 commit
- [ ] 创建 GitHub 仓库 `offer-defuser`
- [ ] README 放上在线链接 + Lighthouse 四项满分截图
- [ ] 补充 `.gitignore`（确认 `node_modules/`, `dist/`, `.vercel/` 已在忽略列表）

**Why**: 工程基建，不影响用户体验，但无 git = 无变更历史、无 GitHub 主页、面试无法展示 commit 记录。30 分钟可完成。

### P2: 接入隐私友好分析 ✅ 2026-06-26

- [x] 接入 Umami（免费 cloud tier，100K events/月）
- [x] `initAnalytics()` 在 `main.tsx` 启动时按需注入 `<script>`（仅当 `VITE_UMAMI_WEBSITE_ID` 已配置）
- [x] 所有现有 `track()` 事件自动桥接到 Umami 自定义事件（7 种事件类型）
- [x] `.env.example` 含接入说明，本地开发留空即静默跳过

**Why**: 当前仅有 localStorage 计数，无法知道真实 PV/UV 和分享转化率。Plausible/Umami 无需 cookie banner、GDPR 合规、接入成本极低，面试时可讲「隐私友好的分析方案」决策。

---

## 内容层面

- [x] **文案风格「务实高效」内容填充** — 现有 frontend.json 已补 `style: "casual"` 896 条 + 新增 `style: "serious"` 380 条，风格切换功能完整。general.json / state-owned.json 待后续分批追加。
- [ ] **og-image.png** — 创建 1200×630 的社交分享预览图（meta 标签已配置，图片待生成）

## 功能层面

- [ ] **人格分布优化** — 5/16 人格在随机模拟中低于 3%（已知限制），收集真实用户数据后调优题目权重
- [ ] **i18n 国际化** — 目前仅中文，后续可扩展英文版

## 技术债

- [ ] **E2E 测试补充** — 新增 P2 功能（tone 切换、style 切换、一键重置）缺少 e2e 覆盖
- [ ] **单元测试补充** — `displayName.ts`、styleMode 过滤逻辑缺少单元测试
- [ ] **Git 初始化** — 项目目前不在 git 版本管理中

## 2026-06-26 已完成

- [x] Vercel 大陆无法访问 → 迁移至 CloudBase 静态托管
- [x] CloudBase 体验版无 SPA 错误文档配置 → 切换为 HashRouter
- [x] E2E 适配 HashRouter（`tests/e2e/helpers.ts` + 三套件，12/12 通过）
- [x] 文档收尾：README、MAINTENANCE_LOG、PRODUCT_SPEC v2.1、交叉验证勾销
- [x] 国企三场景 — 实现已上线，规格已同步（§十一）

## 想法/候选

- [ ] 暗色模式海报 — 当前 Canvas 固定亮色，可支持暗色模式导出
- [ ] 多语言步骤库 — 英文版 step library
- [ ] A/B 测试框架 — 文案风格效果对比
