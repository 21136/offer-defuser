/**
 * Path C: 分享深链渲染
 *
 * 验证 /#/result?p=...&v=... 直接访问时人格和雷达正确渲染，
 * 以及无 v 参数时的降级展示。
 */
import { test, expect } from '@playwright/test';
import { hashRoute, waitForHashRoute, waitForHome } from './helpers';

test.describe('Share URL rendering', () => {
  test('renders persona with radar when both p and v params provided', async ({ page }) => {
    await page.goto(hashRoute('/result?p=resume-anxious&v=50,50,50,50'));

    await expect(page.getByText('你的求职内耗人格')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('简历空白焦虑者')).toBeVisible();

    await expect(page.getByText('简历空白')).toBeVisible();

    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();

    await expect(page.getByText('好友分享了这份结果给你')).toBeVisible();

    await expect(page.getByText('开始测试')).toBeVisible();
  });

  test('shows degraded view when v param is missing', async ({ page }) => {
    await page.goto(hashRoute('/result?p=resume-anxious'));

    await expect(page.getByText('你的求职内耗人格')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('简历空白焦虑者')).toBeVisible();

    await expect(page.getByText('好友未分享雷达数据，完成测试后可查看完整雷达图')).toBeVisible();
  });

  test('shows different persona when different p param', async ({ page }) => {
    await page.goto(hashRoute('/result?p=mass-applyer'));

    await expect(page.getByText('你的求职内耗人格')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('海投摆烂吗喽')).toBeVisible();
  });

  test('redirects to home for invalid personaId', async ({ page }) => {
    await page.goto(hashRoute('/result?p=nonexistent-persona'));

    await waitForHome(page);
    await expect(page.getByText('Offer拆弹专家')).toBeVisible();
  });

  test('deep link persona page renders personality details', async ({ page }) => {
    await page.goto(hashRoute('/result?p=emo-recoverer'));
    await waitForHashRoute(page, /^#\/result/);

    await expect(page.getByText('你的求职内耗人格')).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('📖 人格解读')).toBeVisible();

    const testLink = page.getByText('开始测试');
    await expect(testLink).toBeVisible();
  });
});
