/**
 * Umami Analytics 集成
 *
 * 隐私友好分析 — 无 cookie，GDPR/CCPA 合规，不收集个人数据。
 * 数据存储在 Umami Cloud（或自部署实例），用户无需接受 cookie banner。
 *
 * 设计决策：选 Umami 而非 Plausible，因 Umami Cloud 提供免费 tier
 * （100K events/月，3 网站），Plausible Cloud 最低 €9/月。
 * 两者均为开源、可自部署，后续迁移成本低。
 *
 * 用法：
 * - 生产环境：设置 VITE_UMAMI_WEBSITE_ID → 自动加载脚本 + 自动 PV 追踪
 * - 本地开发：不设 → 静默跳过
 * - 自定义事件：trackUmami('event_name', { key: 'value' })
 */

const WEBSITE_ID: string | undefined = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const SCRIPT_URL: string =
  (import.meta.env.VITE_UMAMI_SCRIPT_URL as string) ||
  'https://cloud.umami.is/script.js';

let initialized = false;

/** 注入 Umami 脚本（仅一次，仅当 Website ID 已配置） */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (!WEBSITE_ID) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = SCRIPT_URL;
  script.setAttribute('data-website-id', WEBSITE_ID);
  script.setAttribute('data-auto-track', 'true');
  document.head.appendChild(script);
}

/** 发送自定义事件到 Umami（Website ID 未配置时静默跳过） */
export function trackUmami(
  event: string,
  data?: Record<string, string | number>,
): void {
  if (!WEBSITE_ID) return;
  window.umami?.track(event, data);
}
