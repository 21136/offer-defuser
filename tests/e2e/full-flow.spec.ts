/**
 * Path A: 答题 → 结果 → 下载海报
 *
 * 完整用户旅程：从首页开始测试，完成 12 题，
 * 到达结果页，验证各项渲染，下载海报。
 */
import { test, expect } from '@playwright/test';
import { hashRoute, waitForHashRoute } from './helpers';

test.describe('Full flow: test → result → poster', () => {
  test('completes 12 questions and reaches result page', async ({ page }) => {
    await page.goto(hashRoute('/'));
    await expect(page.getByText('Offer拆弹专家')).toBeVisible();

    await page.getByText('求职人格测试').first().click();
    await waitForHashRoute(page, /^#\/test/);
    await expect(page.getByText('求职人格测试')).toBeVisible();

    await expect(page.getByText('加载题目中...')).not.toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 12; i++) {
      const questionCard = page.locator('.bg-white.dark\\:bg-gray-800.rounded-2xl').first();
      await expect(questionCard).toBeVisible();

      const optionButtons = questionCard.locator('button');
      await optionButtons.first().click();

      if (i < 11) {
        await page.getByText('下一题').click();
      } else {
        await page.getByText('查看结果').click();
      }
    }

    await waitForHashRoute(page, /^#\/result\?p=/);

    await expect(page.getByText('你的求职内耗人格')).toBeVisible();

    const radarSvg = page.locator('svg').first();
    await expect(radarSvg).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('📖 人格解读')).toBeVisible();
    await expect(page.getByText('💪 优势')).toBeVisible();
    await expect(page.getByText('⚡ 短板')).toBeVisible();

    await expect(page.getByText('🔧 用这个人格拆解我的 Offer')).toBeVisible();
    await expect(page.getByText('📋 复制结果链接')).toBeVisible();

    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
    await expect(canvas.first()).toHaveAttribute('width', '1080');
    await expect(canvas.first()).toHaveAttribute('height', '1920');
  });

  test('downloads poster PNG', async ({ page }) => {
    await page.goto(hashRoute('/test'));
    await expect(page.getByText('加载题目中...')).not.toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 12; i++) {
      const questionCard = page.locator('.bg-white.dark\\:bg-gray-800.rounded-2xl').first();
      await questionCard.locator('button').first().click();
      if (i < 11) {
        await page.getByText('下一题').click();
      } else {
        await page.getByText('查看结果').click();
      }
    }

    await waitForHashRoute(page, /^#\/result\?p=/);

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.getByText('📸 下载海报').click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/offer-defuser-result-.+\.png/);
  });

  test('tracks test_complete event', async ({ page }) => {
    await page.goto(hashRoute('/test'));
    await expect(page.getByText('加载题目中...')).not.toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 12; i++) {
      const questionCard = page.locator('.bg-white.dark\\:bg-gray-800.rounded-2xl').first();
      await questionCard.locator('button').first().click();
      if (i < 11) {
        await page.getByText('下一题').click();
      } else {
        await page.getByText('查看结果').click();
      }
    }

    await waitForHashRoute(page, /^#\/result\?p=/);

    const trackingRaw = await page.evaluate(() =>
      localStorage.getItem('offer-defuser:tracking'),
    );
    expect(trackingRaw).not.toBeNull();

    const tracking = JSON.parse(trackingRaw!);
    const events = tracking.map((e: { event: string }) => e.event);
    expect(events).toContain('test_start');
    expect(events).toContain('test_complete');
    expect(events).toContain('page_view');
  });
});
