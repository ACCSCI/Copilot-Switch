import { test, expect } from '../fixtures/electron';
import { HomePage } from '../pages/HomePage';
import { faker } from '@faker-js/faker';

test.describe('删除供应商', () => {
  test('点击删除 → 确认 → 卡片消失', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    const name = `Del ${faker.string.alphanumeric(4)}`;
    await page.getByTestId('input-name').fill(name);
    await page.getByTestId('input-base-url').fill('https://x.example/v1');
    await page.getByTestId('input-api-key').fill('sk-x');
    await page.getByTestId('input-model').fill('m');
    await page.getByTestId('submit-button').click();
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    await expect(home.providerCard(name)).toBeVisible();

    // 删除
    await home.clickDelete(name);
    await page.getByRole('button', { name: /^删除$/ }).click();
    await expect(home.providerCard(name)).toHaveCount(0, { timeout: 5000 });
  });

  test('点击删除 → 取消 → 卡片仍在', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    const name = `Cancel ${faker.string.alphanumeric(4)}`;
    await page.getByTestId('input-name').fill(name);
    await page.getByTestId('input-base-url').fill('https://x.example/v1');
    await page.getByTestId('input-api-key').fill('sk-x');
    await page.getByTestId('input-model').fill('m');
    await page.getByTestId('submit-button').click();
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });

    await home.clickDelete(name);
    await page.getByRole('button', { name: '取消' }).click();
    await expect(home.providerCard(name)).toBeVisible();
  });
});
