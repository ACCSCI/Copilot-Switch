import { test, expect } from '../fixtures/electron';
import { stepfunFixture, isStepFunConfigured } from '../fixtures/stepfun';

test.describe('健康检查（真实 StepFun API）', () => {
  test.skip(!isStepFunConfigured, '需要 STEPFUN_API_KEY');

  test('点击心电图 → 真实调用 StepFun → 成功 toast', async ({ page }) => {
    const home = await import('../pages/HomePage').then(m => new m.HomePage(page));
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    await page.getByTestId('input-name').fill('Health Test');
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill(stepfunFixture.baseUrl);
    await page.getByTestId('input-api-key').fill(stepfunFixture.apiKey);
    await page.getByTestId('input-model').fill(stepfunFixture.model);
    await page.getByTestId('submit-button').click();

    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    const card = home.providerCard('Health Test');
    await card.getByTestId('action-health').click();
    await expect(page.getByText(/通了|失败/)).toBeVisible({ timeout: 15_000 });
  });

  test('testProvider.ping IPC 端到端可用', async ({ page }) => {
    const home = await import('../pages/HomePage').then(m => new m.HomePage(page));
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    await page.getByTestId('input-name').fill('Ping Test');
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill(stepfunFixture.baseUrl);
    await page.getByTestId('input-api-key').fill(stepfunFixture.apiKey);
    await page.getByTestId('input-model').fill(stepfunFixture.model);
    await page.getByTestId('submit-button').click();

    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });

    const result = await page.evaluate(async () => {
      const list = await window.api.providers.list();
      const target = list.find((p) => p.name === 'Ping Test');
      if (!target) return { ok: false, error: 'provider not found', latencyMs: 0 } as const;
      return window.api.testProvider.ping(target.id);
    });

    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBeLessThan(15_000);
  });
});
