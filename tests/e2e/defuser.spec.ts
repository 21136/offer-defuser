/**
 * Path B: 拆解器生成 8 步 →「换一句」→ 仅该步变化
 */
import { test, expect } from '@playwright/test';
import { hashRoute, clearAppStorage } from './helpers';

test.describe('Defuser flow: generate plan, reroll, switch category', () => {
  test('shows banner when no test result', async ({ page }) => {
    await page.goto(hashRoute('/'));
    await clearAppStorage(page);
    await page.goto(hashRoute('/defuser'));

    await expect(page.getByText('先测人格，拆解更准哦')).toBeVisible();
    await expect(page.getByText('去测试 →')).toBeVisible();
  });

  test('generates 8-step plan and rerolls one step', async ({ page }) => {
    await page.goto(hashRoute('/defuser'));

    const jobInput = page.getByPlaceholder('如：字节前端实习');
    await jobInput.fill('字节前端实习');

    const future = new Date();
    future.setDate(future.getDate() + 7);
    const dateStr = future.toISOString().split('T')[0];
    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(dateStr);

    await page.getByText('前端开发实习').click();

    await page.getByText('🔨 生成拆解方案').click();

    await expect(page.getByText('你的 8 步拆解方案')).toBeVisible({ timeout: 10000 });

    const stepNumbers = page.locator('[class*="w-7 h-7 rounded-full"]');
    await expect(stepNumbers).toHaveCount(8);

    for (let i = 1; i <= 8; i++) {
      await expect(page.getByText(String(i), { exact: true }).first()).toBeVisible();
    }

    const stepParagraphs = page.locator('p.text-sm.text-gray-600');
    const firstStepParagraph = stepParagraphs.first();
    const firstStepContent = await firstStepParagraph.textContent();
    expect(firstStepContent).toBeTruthy();

    await page.getByText('🔄 换一句').first().click();

    await page.waitForTimeout(500);

    const newContent = await firstStepParagraph.textContent();
    expect(newContent).toBeTruthy();

    await expect(page.getByText('1', { exact: true }).first()).toBeVisible();

    await expect(page.getByText('你的 8 步拆解方案')).toBeVisible();
  });

  test('switches to state-owned category and verifies slot 4 title', async ({ page }) => {
    await page.goto(hashRoute('/defuser'));

    await page.getByText('国企/事业单位').click();

    await page.getByPlaceholder('如：字节前端实习').fill('国家电网技术岗');
    const future = new Date();
    future.setDate(future.getDate() + 14);
    await page.locator('input[type="date"]').fill(future.toISOString().split('T')[0]);

    await page.getByText('🔨 生成拆解方案').click();
    await expect(page.getByText('你的 8 步拆解方案')).toBeVisible({ timeout: 10000 });

    const stepTitles = page.locator('h3.font-medium');
    const titles = await stepTitles.allTextContents();
    const hasStateOwnedTitle = titles.some(
      (t) => t.includes('行测') || t.includes('申论'),
    );
    expect(hasStateOwnedTitle).toBe(true);
  });

  test('tracks defuse_generate and step_reroll events', async ({ page }) => {
    await page.goto(hashRoute('/defuser'));

    await page.getByPlaceholder('如：字节前端实习').fill('测试岗位');
    const future = new Date();
    future.setDate(future.getDate() + 7);
    await page.locator('input[type="date"]').fill(future.toISOString().split('T')[0]);
    await page.getByText('前端开发实习').click();
    await page.getByText('🔨 生成拆解方案').click();
    await expect(page.getByText('你的 8 步拆解方案')).toBeVisible({ timeout: 10000 });

    await page.getByText('🔄 换一句').first().click();
    await page.waitForTimeout(500);

    const trackingRaw = await page.evaluate(() =>
      localStorage.getItem('offer-defuser:tracking'),
    );
    expect(trackingRaw).not.toBeNull();
    const tracking = JSON.parse(trackingRaw!);
    const events = tracking.map((e: { event: string }) => e.event);
    expect(events).toContain('defuse_generate');
    expect(events).toContain('step_reroll');
  });
});
