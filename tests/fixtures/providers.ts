import type { ProviderInput } from '@shared/schemas';

/** 创建测试供应商 fixture */
export function createTestProvider(overrides: Partial<ProviderInput> = {}): ProviderInput {
  return {
    name: 'Test Provider',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-1234',
    wireApi: 'completions',
    model: 'gpt-4',
    icon: '🤖',
    ...overrides,
  };
}

export const stepfunFixture: ProviderInput = {
  name: 'StepFun (E2E)',
  type: 'openai',
  baseUrl: process.env.STEPFUN_BASE_URL ?? 'https://api.stepfun.com/step_plan/v1',
  apiKey: process.env.STEPFUN_API_KEY ?? 'sk-test-placeholder',
  wireApi: 'completions',
  model: process.env.STEPFUN_MODEL ?? 'step-3.7-flash',
  icon: '🌟',
};
