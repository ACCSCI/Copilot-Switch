import { test, expect } from '../fixtures/electron';
import { HomePage } from '../pages/HomePage';
import { stepfunFixture, isStepFunConfigured } from '../fixtures/stepfun';

test.describe('激活供应商（真实 StepFun API）', () => {
  test.skip(!isStepFunConfigured, '需要 STEPFUN_API_KEY');

  test('添加 StepFun → 激活 → 环境变量正确 → 真实 ping 成功', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    // 填表
    await page.getByTestId('input-name').fill(stepfunFixture.name);
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill(stepfunFixture.baseUrl);
    await page.getByTestId('input-api-key').fill(stepfunFixture.apiKey);
    await page.getByTestId('input-model').fill(stepfunFixture.model);
    await page.getByTestId('input-icon').fill(stepfunFixture.icon);
    await page.getByTestId('submit-button').click();

    // 回到首页
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });
    await expect(home.providerCard(stepfunFixture.name)).toBeVisible();

    // 激活
    await home.activateProvider(stepfunFixture.name);
    await home.expectActive(stepfunFixture.name);

    // 通过 IPC 验证环境变量
    const env = await page.evaluate(() => window.api.system.getEnvSnapshot());
    expect(env.OPENAI_API_KEY).toBe(stepfunFixture.apiKey);
    expect(env.OPENAI_BASE_URL).toBe(stepfunFixture.baseUrl);
    expect(env.COPILOT_MODEL).toBe(stepfunFixture.model);

    // 真实 API ping
    const listResult = await page.evaluate(() => window.api.providers.list());
    const target = listResult.find((p) => p.name === stepfunFixture.name);
    expect(target).toBeDefined();
    const pingResult = await page.evaluate((id) => window.api.testProvider.ping(id), target!.id);
    expect(pingResult.ok).toBe(true);
    expect(pingResult.latencyMs).toBeLessThan(15_000);
  });

  test('切换后 Anthropic 残留变量被清空', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickAdd();
    await expect(page.getByRole('heading', { name: /添加配置/ })).toBeVisible();

    await page.getByTestId('input-name').fill(stepfunFixture.name + ' Switch');
    await page.getByTestId('type-select').click();
    await page.getByRole('option', { name: 'OpenAI / OpenAI 兼容' }).click();
    await page.getByTestId('input-base-url').fill(stepfunFixture.baseUrl);
    await page.getByTestId('input-api-key').fill(stepfunFixture.apiKey);
    await page.getByTestId('input-model').fill(stepfunFixture.model);
    await page.getByTestId('submit-button').click();
    await expect(page.getByRole('heading', { name: 'Copilot Switch' })).toBeVisible({ timeout: 5000 });

    await home.activateProvider(stepfunFixture.name + ' Switch');
    await page.waitForTimeout(1000);

    const env = await page.evaluate(() => window.api.system.getEnvSnapshot());
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.OPENAI_API_KEY).toBe(stepfunFixture.apiKey);
  });

  test('IPC 创建 → ping 验证加密 round-trip', async ({ page }) => {
    const result = await page.evaluate(async (testKey) => {
      const dto = await window.api.providers.create({
        name: 'RoundTrip Test',
        type: 'openai',
        baseUrl: 'https://api.stepfun.com/step_plan/v1',
        apiKey: testKey,
        model: 'step-3.7-flash',
        wireApi: 'completions',
      });
      const ping = await window.api.testProvider.ping(dto.id);
      await window.api.providers.delete(dto.id);
      return { hasApiKey: dto.hasApiKey, pingOk: ping.ok, pingError: ping.error };
    }, stepfunFixture.apiKey);
    expect(result.hasApiKey).toBe(true);
    expect(result.pingOk).toBe(true);
  });
});
