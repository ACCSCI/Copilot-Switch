import { test, expect } from '../fixtures/electron';
import { HomePage } from '../pages/HomePage';
import { AddProviderPage } from '../pages/AddProviderPage';
import { faker } from '@faker-js/faker';

test.describe('添加供应商（用户流程）', () => {
  test('用户填写表单 → 提交 → 回到主页看到新卡片', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.emptyState).toBeVisible();

    // 点击添加按钮（走 UI 流程，不 page.goto）
    await home.clickAdd();
    // 等待添加页面渲染
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    const name = `Test ${faker.string.alphanumeric(6)}`;
    await page.getByTestId('input-name').fill(name);
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill('https://api.example.com/v1');
    await page.getByTestId('input-api-key').fill('sk-test-' + faker.string.alphanumeric(20));
    await page.getByTestId('input-model').fill('gpt-4');
    await page.getByTestId('input-icon').fill('🤖');
    await page.getByTestId('submit-button').click();

    // 验证：回到主页看到新卡片
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    await expect(home.providerCard(name)).toBeVisible({ timeout: 5000 });
  });

  test('表单校验：name 为空时阻止提交', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    // 只填部分字段，不填 name
    await page.getByTestId('input-base-url').fill('https://x.example.com/v1');
    await page.getByTestId('input-model').fill('gpt-4');
    await page.getByTestId('submit-button').click();
    // 应该看到 name 错误提示
    await expect(page.getByText(/名称不能为空/)).toBeVisible();
  });

  test('表单校验：baseUrl 非法时阻止提交', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    await page.getByTestId('input-name').fill('X');
    await page.getByTestId('input-base-url').fill('not-a-url');
    await page.getByTestId('input-model').fill('gpt-4');
    await page.getByTestId('input-api-key').fill('sk-x');
    await page.getByTestId('submit-button').click();
    await expect(page.getByText(/Base URL 必须是合法 URL/)).toBeVisible();
  });

  test('azure 类型缺 apiVersion 时报错', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    await page.getByTestId('input-name').fill('Azure');
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: /Azure/ }).click();
    await page.getByTestId('input-base-url').fill('https://x.openai.azure.com');
    await page.getByTestId('input-api-key').fill('sk-azure');
    await page.getByTestId('input-model').fill('gpt-4');
    await page.getByTestId('submit-button').click();
    // 等待验证错误出现（azureApiVersion 的 "Invalid" 错误消息）
    await expect(page.locator('.text-red-500').first()).toBeVisible({ timeout: 3000 });
  });
});
