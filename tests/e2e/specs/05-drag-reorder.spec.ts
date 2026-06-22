import { test, expect } from '../fixtures/electron';
import { HomePage } from '../pages/HomePage';
import { faker } from '@faker-js/faker';

test.describe('拖拽排序', () => {
  test('拖动 B 卡片到 A 之前，顺序变为 B、A、C', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // 准备 3 个供应商
    for (const label of ['A', 'B', 'C']) {
      await home.clickAdd();
      await page.getByTestId('input-name').fill(`${label} ${faker.string.alphanumeric(3)}`);
      await page.getByTestId('input-base-url').fill('https://x.example/v1');
      await page.getByTestId('input-api-key').fill('sk-x');
      await page.getByTestId('input-model').fill('m');
      await page.getByTestId('submit-button').click();
      await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    }

    // 取实际名称
    const cards = page.getByTestId('provider-card');
    const count = await cards.count();
    expect(count).toBe(3);

    const beforeOrder = await cards.allTextContents();
    const nameA = beforeOrder[0]?.match(/A [A-Z0-9]+/)?.[0]!;
    const nameB = beforeOrder[1]?.match(/B [A-Z0-9]+/)?.[0]!;
    const nameC = beforeOrder[2]?.match(/C [A-Z0-9]+/)?.[0]!;

    // 拖拽：用 nth 定位精确的 drag handle
    const handleB = cards.nth(1).getByTestId('drag-handle');
    const cardABox = await cards.nth(0).boundingBox();
    await handleB.hover();
    await page.mouse.down();
    if (cardABox) {
      await page.mouse.move(cardABox.x + 50, cardABox.y + 10, { steps: 10 });
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    // 验证顺序
    const afterOrder = await cards.allTextContents();
    expect(afterOrder[0]).toContain('B');
    expect(afterOrder[1]).toContain('A');
    expect(afterOrder[2]).toContain('C');

    void nameC;
  });
});
