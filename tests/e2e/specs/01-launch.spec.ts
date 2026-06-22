import { test, expect } from '../fixtures/electron';

test.describe('应用启动', () => {
  test('应用启动后看到主标题与空态', async ({ page, app }) => {
    // 等待 dev server 加载完成
    await page.waitForLoadState('domcontentloaded');
    // 调试：打印当前 URL 和 HTML
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('URL:', url, 'TITLE:', title, 'BODY:', bodyText.slice(0, 200));
    // 等待 React 渲染
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('空态时显示"添加配置"红色按钮', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const btn = page.getByTestId('add-provider-button');
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await expect(btn).toHaveText(/添加配置/);
  });
});
