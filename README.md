# Offer拆弹专家

> 把崩溃的求职流程拆成今日可执行小事，测你的求职内耗人格

面向实习/秋招应届生的轻量化求职解压 Web 工具：12 题人格测试 + 8 步 Offer 拆解方案 + 分享海报。

## 在线体验

| 环境 | 地址 | 说明 |
|------|------|------|
| **大陆主站** | [CloudBase 静态托管](https://my-dev-env-d5gmbgs48b69f67ba-1446340184.tcloudbaseapp.com) | 国内可访问，Hash 路由 |
| **海外镜像** | [offer-defuser.vercel.app](https://offer-defuser.vercel.app) | Vercel 部署 |

分享链接格式：`https://<域名>/#/result?p=<personaId>&v=<delay>,<apply>,<perfect>,<interview>`

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run test:run     # Vitest 单元测试
npm run test:e2e     # Playwright E2E（须 Hash 路由 /#/path）
npm run build        # 生产构建 → dist/
npm run validate:content   # 校验 2688 条步骤文案
npm run validate:dist      # 人格分布模拟验收
```

## 技术栈

React 19 · TypeScript 5.7 · Vite 6 · Zustand 5 · Tailwind 4 · React Router v7 (HashRouter)

零后端、零付费 API，纯客户端 SPA。

## 文档索引

| 文档 | 用途 |
|------|------|
| [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) | 产品规格书 v2（设计基线 + 实现状态） |
| [docs/MAINTENANCE_LOG.md](docs/MAINTENANCE_LOG.md) | **维护审计日志**（每次文档/工程收尾可追溯） |
| [docs/CONTENT_STYLE_GUIDE.md](docs/CONTENT_STYLE_GUIDE.md) | 2688 条文案生产规范 |
| [CLAUDE.md](CLAUDE.md) | AI 协作地图（路由、数据流、关键数字） |
| [CHANGELOG.md](CHANGELOG.md) | 功能变更记录 |
| [BACKLOG.md](BACKLOG.md) | 待办清单 |

历史评审文档：`docs/PRODUCT_SPEC_REVIEW.md`、`docs/PRODUCT_SPEC_CROSS_VALIDATION.md`

## 项目结构（简）

```
src/
  assets/          # questions / personas / steps（2688 条）
  services/        # 打分、匹配、步骤生成算法
  pages/           # 6 个路由页面
  components/      # RadarChart、ShareCanvas
tests/
  services/        # Vitest
  e2e/             # Playwright（Hash 路由 helpers）
scripts/           # genScoreBounds、validateContent 等
```

## 许可证

私有项目，未指定开源协议。
