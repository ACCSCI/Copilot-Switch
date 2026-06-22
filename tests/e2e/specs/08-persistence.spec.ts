import { test, expect } from '../fixtures/electron';
import { faker } from '@faker-js/faker';
import { stepfunFixture, isStepFunConfigured } from '../fixtures/stepfun';

test.describe('持久化', () => {
  test.skip(!isStepFunConfigured, '需要 STEPFUN_API_KEY');

  test('激活的供应商环境变量正确', async ({ page }) => {
    const home = await import('../pages/HomePage').then(m => new m.HomePage(page));
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    const name = 'Persist ' + faker.string.alphanumeric(4);
    await page.getByTestId('input-name').fill(name);
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill(stepfunFixture.baseUrl);
    await page.getByTestId('input-api-key').fill(stepfunFixture.apiKey);
    await page.getByTestId('input-model').fill(stepfunFixture.model);
    await page.getByTestId('submit-button').click();

    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    await home.activateProvider(name);
    await home.expectActive(name);

    const env = await page.evaluate(() => window.api.system.getEnvSnapshot());
    expect(env.OPENAI_API_KEY).toBe(stepfunFixture.apiKey);
    expect(env.COPILOT_MODEL).toBe(stepfunFixture.model);
  });
});
