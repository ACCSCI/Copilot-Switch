import { test, expect } from '../fixtures/electron';
import { HomePage } from '../pages/HomePage';
import { faker } from '@faker-js/faker';

test.describe('编辑供应商', () => {
  test('编辑名称和模型后卡片显示新内容', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // 先添加
    await home.clickAdd();
    const oldName = `Old ${faker.string.alphanumeric(4)}`;
    await page.getByTestId('input-name').fill(oldName);
    await page.getByTestId('input-base-url').fill('https://x.example/v1');
    await page.getByTestId('input-api-key').fill('sk-old');
    await page.getByTestId('input-model').fill('gpt-3.5');
    await page.getByTestId('submit-button').click();

    // 回到主页
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });

    // 编辑
    const card = home.providerCard(oldName);
    await card.getByTestId('action-edit').click();

    const newName = `New ${faker.string.alphanumeric(4)}`;
    await page.getByTestId('input-name').fill(newName);
    await page.getByTestId('input-model').fill('gpt-4-turbo');
    await page.getByTestId('submit-button').click();

    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    await expect(home.providerCard(newName)).toBeVisible({ timeout: 5000 });
    await expect(home.providerCard(oldName)).toHaveCount(0);
  });
});
