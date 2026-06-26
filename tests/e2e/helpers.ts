/**
 * HashRouter 导航辅助
 *
 * 应用使用 HashRouter（CloudBase 静态托管无 SPA fallback 配置）。
 * Playwright 须使用 /#/path 而非 /path。
 */

/** 转为 Hash 路由路径，如 hashRoute('/test') → '/#/test' */
export function hashRoute(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/#${normalized}`;
}

/** 等待进入指定 Hash 路由（path 不含 #，可含 query） */
export async function waitForHashRoute(
  page: import('@playwright/test').Page,
  pathPattern: RegExp,
  timeout = 10000,
): Promise<void> {
  await page.waitForURL((url) => pathPattern.test(url.hash), { timeout });
}

/** 等待回到首页（hash 为空或 #/） */
export async function waitForHome(page: import('@playwright/test').Page, timeout = 10000): Promise<void> {
  await page.waitForURL(
    (url) => url.hash === '' || url.hash === '#/' || url.hash === '#',
    { timeout },
  );
}

/** 清空本应用 localStorage，保证 NO_PERSONA 等隔离场景 */
export async function clearAppStorage(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('offer-defuser:'));
    for (const key of keys) localStorage.removeItem(key);
  });
}
