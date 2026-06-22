// 主进程测试的全局设置
// 例如：清理环境变量、临时数据库
import { afterEach, beforeEach } from 'vitest';

const ENV_VARS_TO_CLEAN = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'AZURE_OPENAI_KEY',
  'AZURE_OPENAI_BASE_URL',
  'AZURE_API_VERSION',
  'COPILOT_MODEL',
  'COPILOT_WIRE_API',
  'MY_BEARER_TOKEN',
];

beforeEach(() => {
  for (const key of ENV_VARS_TO_CLEAN) {
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_VARS_TO_CLEAN) {
    delete process.env[key];
  }
});
