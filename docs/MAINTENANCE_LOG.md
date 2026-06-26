# 维护审计日志

> **用途**: 记录每次文档同步、工程收尾、测试修复等维护性工作，便于多人/多 AI 协作时追溯「谁改了什么、为什么改」。  
> **格式**: 每条会话一个 `## YYYY-MM-DD — 标题` 块，内含操作清单、影响文件、验证结果。

---

## 2026-06-26 — P2 隐私友好分析（Umami）

**执行者**: Claude Code Agent  
**触发原因**: BACKLOG P2 — 当前仅有 localStorage 计数，无法知道真实 PV/UV 和分享转化率。

### 完成项

| # | 动作 | 产出/影响 |
|---|------|-----------|
| 1 | 新建 `src/utils/analytics.ts` | Umami 脚本动态注入 + `trackUmami()` 封装 |
| 2 | 新建 `src/models/umami.d.ts` | `window.umami.track()` 类型声明 |
| 3 | 修改 `src/utils/tracker.ts` | `track()` 末尾桥接到 Umami（7 种事件自动上报） |
| 4 | 修改 `src/main.tsx` | 应用启动时调用 `initAnalytics()` |
| 5 | 新建 `.env.example` | 接入说明 + `VITE_UMAMI_WEBSITE_ID` / `VITE_UMAMI_SCRIPT_URL` 模板 |
| 6 | 更新 `BACKLOG.md` | P2 标记完成 |
| 7 | 更新 `CHANGELOG.md` | 添加 P2 条目 |

### 验证命令与结果

```bash
npm run build     # ✅ 通过（tsc -b && vite build）
npm run test:run  # ✅ 50/50 通过
```

### 关联文件一览

```
src/utils/analytics.ts               (新建: Umami 脚本注入 + trackUmami)
src/models/umami.d.ts                (新建: window.umami 类型)
src/utils/tracker.ts                 (修改: +2 行 bridge)
src/main.tsx                         (修改: +4 行 init)
.env.example                         (新建: 配置模板)
BACKLOG.md                           (修改: P2 完成)
CHANGELOG.md                         (修改: 新条目)
docs/MAINTENANCE_LOG.md              (本文件)
```

---

## 2026-06-26 — P0 严肃风格内容填充（frontend 场景）

**执行者**: Claude Code Agent  
**触发原因**: BACKLOG P0 — 风格切换（😄 松弛自嘲 / 💼 务实高效）已上线但 serious 模式无专属文案，对用户不可见。

### 完成项

| # | 动作 | 产出/影响 |
|---|------|-----------|
| 1 | 现有 896 条选项补 `"style": "casual"` | `scripts/addCasualStyle.ts` 运行，全部标注完成 |
| 2 | 8 个 agent 并行生成 serious 文案 | 16 人格 × 8 步 × 2-3 条 = 380 条 serious 选项 |
| 3 | 合并脚本 `mergeSeriousContent.ts` | 读取 16 个临时文件 → 合并入 `frontend.json` → 清理临时文件 |
| 4 | 更新 `scripts/validateContent.ts` | `EXPECTED_OPTIONS` 从严格 7 改为 7-10 区间 |
| 5 | 修复 10 条缺失 `{{variable}}` 的文案 | `scripts/fixMissingVars.ts` |
| 6 | 更新 `BACKLOG.md` | P0 标记完成 + 内容层面勾销 |
| 7 | 建 `scripts/addCasualStyle.ts` | 工具脚本，可复用于 general/state-owned |
| 8 | 建 `scripts/mergeSeriousContent.ts` | 通用合并工具，支持后续分批追加 |

### 验证命令与结果

```bash
npm run validate:content  # ✅ 0 errors, 0 warnings
npm run test:run          # ✅ 50/50 通过
```

### 关联文件一览

```
src/assets/steps/frontend.json       (修改: 896→1276 条选项)
scripts/validateContent.ts           (修改: 7→7-10 区间)
scripts/addCasualStyle.ts            (新建)
scripts/mergeSeriousContent.ts       (新建)
scripts/fixMissingVars.ts            (新建)
BACKLOG.md                           (修改: P0 + 内容层面)
docs/MAINTENANCE_LOG.md              (本文件)
```

## 2026-06-26 — 文档收尾 + E2E 适配 HashRouter

**执行者**: Cursor Agent  
**触发原因**: 项目功能已上线，但主规格书与实现脱节（HashRouter、CloudBase、E2E 全挂）；用户要求「有文档记录干的活，方便追踪」。

### 完成项

| # | 动作 | 产出/影响 |
|---|------|-----------|
| 1 | 新建 `README.md` | 线上地址、本地命令、文档索引 |
| 2 | 新建 `docs/MAINTENANCE_LOG.md` | 本文档（审计追踪） |
| 3 | 更新 `docs/PRODUCT_SPEC.md` | 新增 §十一实现状态；§5.5/路由改为 `/#/...`；§六双部署；国企三场景已上线 |
| 4 | 更新 `docs/PRODUCT_SPEC_CROSS_VALIDATION.md` | 合入清单勾销 + v1.1 注记 |
| 5 | 更新 `CLAUDE.md` | HashRouter 约定、E2E helpers 说明 |
| 6 | 更新 `BACKLOG.md` | E2E HashRouter 项标完成；补充维护日志引用 |
| 7 | 更新 `CHANGELOG.md` | 本条会话变更摘要 |
| 8 | 更新 `index.html` | canonical/og:url 指向 CloudBase 主站 |
| 9 | 更新 `docs/CONTENT_STYLE_GUIDE.md` | 补充 `style` 字段与完成度说明 |
| 10 | 新增 `tests/e2e/helpers.ts` | `hashRoute` / `waitForHashRoute` / `clearAppStorage` |
| 11 | 修复 E2E 三套件 | `full-flow` / `share-url` / `defuser` 全部改用 Hash 路径 |

### 未在本会话完成（仍见 BACKLOG）

- `public/og-image.png` 社交预览图（meta 已配置，图片未生成）
- `serious` 风格专属文案填充（UI 壳子已有）
- Git 仓库初始化
- P2 功能（tone 切换、style 切换、一键重置）的 E2E 补充

### 验证命令与结果

```bash
npm run test:run    # 50/50 通过
npm run test:e2e    # 12/12 通过
```

### 关联文件一览

```
README.md                          (新建)
docs/MAINTENANCE_LOG.md            (新建)
docs/PRODUCT_SPEC.md               (修改)
docs/PRODUCT_SPEC_CROSS_VALIDATION.md (修改)
docs/CONTENT_STYLE_GUIDE.md        (修改)
CLAUDE.md                          (修改)
BACKLOG.md                         (修改)
CHANGELOG.md                       (修改)
index.html                         (修改)
tests/e2e/helpers.ts               (新建)
tests/e2e/full-flow.spec.ts        (修改)
tests/e2e/share-url.spec.ts        (修改)
tests/e2e/defuser.spec.ts          (修改)
```

---

*后续维护请在本文件顶部（本段之上）追加新会话块，并在 `CHANGELOG.md` 写同日摘要。*
