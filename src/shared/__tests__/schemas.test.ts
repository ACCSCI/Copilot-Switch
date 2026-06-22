import { describe, it, expect } from 'vitest';
import {
  providerInputSchema,
  providerTypeSchema,
  wireApiSchema,
  envVarNameSchema,
  envVarMapSchema,
  activateProviderInputSchema,
  pingResultSchema,
  ENV_VAR_MATRIX,
} from '../schemas';

describe('providerTypeSchema', () => {
  it('接受合法的供应商类型', () => {
    expect(providerTypeSchema.parse('openai')).toBe('openai');
    expect(providerTypeSchema.parse('azure')).toBe('azure');
    expect(providerTypeSchema.parse('anthropic')).toBe('anthropic');
  });

  it('拒绝未知类型', () => {
    expect(() => providerTypeSchema.parse('google')).toThrow();
    expect(() => providerTypeSchema.parse('')).toThrow();
  });
});

describe('wireApiSchema', () => {
  it('只接受 completions / responses', () => {
    expect(wireApiSchema.parse('completions')).toBe('completions');
    expect(wireApiSchema.parse('responses')).toBe('responses');
    expect(() => wireApiSchema.parse('messages')).toThrow();
  });
});

describe('providerInputSchema', () => {
  const validInput = {
    name: 'Claude Official',
    type: 'anthropic' as const,
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'sk-ant-test',
    model: 'claude-sonnet-4.5',
    icon: '🤖',
    wireApi: 'completions' as const,
  };

  it('通过合法输入', () => {
    const result = providerInputSchema.parse(validInput);
    expect(result.name).toBe('Claude Official');
    expect(result.type).toBe('anthropic');
    expect(result.wireApi).toBe('completions'); // 默认值
  });

  it('baseUrl 必须是合法 URL', () => {
    expect(() => providerInputSchema.parse({ ...validInput, baseUrl: 'not-a-url' })).toThrow();
    expect(() => providerInputSchema.parse({ ...validInput, baseUrl: '' })).toThrow();
  });

  it('name 长度 1-64', () => {
    expect(() => providerInputSchema.parse({ ...validInput, name: '' })).toThrow();
    expect(() => providerInputSchema.parse({ ...validInput, name: 'a'.repeat(65) })).toThrow();
    expect(providerInputSchema.parse({ ...validInput, name: 'a' })).toBeTruthy();
  });

  it('apiKey 可选（Ollama 等本地不需要）', () => {
    const ollamaInput = { ...validInput, type: 'openai' as const, baseUrl: 'http://localhost:11434/v1', apiKey: undefined, bearerToken: undefined };
    const result = providerInputSchema.parse(ollamaInput);
    expect(result.apiKey).toBeUndefined();
    expect(result.bearerToken).toBeUndefined();
  });

  it('azure 类型需要 azureApiVersion', () => {
    const azureInput = { ...validInput, type: 'azure' as const, baseUrl: 'https://x.openai.azure.com' };
    expect(() => providerInputSchema.parse(azureInput)).toThrow(/azureApiVersion/);
    const result = providerInputSchema.parse({ ...azureInput, azureApiVersion: '2024-10-21' });
    expect(result.azureApiVersion).toBe('2024-10-21');
  });

  it('拒绝过长或非字符串的字段', () => {
    expect(() => providerInputSchema.parse({ ...validInput, icon: 'a'.repeat(10) })).toThrow();
  });
});

describe('envVarNameSchema', () => {
  it('只接受合法的环境变量名', () => {
    expect(envVarNameSchema.parse('OPENAI_API_KEY')).toBe('OPENAI_API_KEY');
    expect(envVarNameSchema.parse('FOUNDRY_API_KEY_2')).toBe('FOUNDRY_API_KEY_2');
  });

  it('拒绝小写、含特殊字符', () => {
    expect(() => envVarNameSchema.parse('openai_api_key')).toThrow();
    expect(() => envVarNameSchema.parse('OPENAI-API-KEY')).toThrow();
    expect(() => envVarNameSchema.parse('123KEY')).toThrow();
  });
});

describe('envVarMapSchema', () => {
  it('接受键为合法环境变量名、值为字符串的对象', () => {
    const map = { OPENAI_API_KEY: 'sk-test', OPENAI_BASE_URL: 'https://x' };
    expect(envVarMapSchema.parse(map)).toEqual(map);
  });

  it('拒绝非法 key', () => {
    expect(() => envVarMapSchema.parse({ 'invalid key': 'v' })).toThrow();
  });
});

describe('activateProviderInputSchema', () => {
  it('需要 providerId 字符串', () => {
    expect(() => activateProviderInputSchema.parse({})).toThrow();
    expect(activateProviderInputSchema.parse({ providerId: 'abc' })).toEqual({ providerId: 'abc' });
  });
});

describe('pingResultSchema', () => {
  it('验证 ping 结果结构', () => {
    const result = pingResultSchema.parse({
      ok: true,
      latencyMs: 123,
      content: 'hi',
      model: 'step-3.7-flash',
      usage: { prompt: 1, completion: 1, total: 2 },
    });
    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBe(123);
  });

  it('失败时只要求 ok+latencyMs+error', () => {
    const r = pingResultSchema.parse({ ok: false, latencyMs: 0, error: 'timeout' });
    expect(r.error).toBe('timeout');
  });
});

describe('ENV_VAR_MATRIX', () => {
  it('为每种 type 定义 keyEnv 和 baseUrlEnv', () => {
    expect(ENV_VAR_MATRIX.openai.keyEnv).toBe('OPENAI_API_KEY');
    expect(ENV_VAR_MATRIX.azure.keyEnv).toBe('AZURE_OPENAI_KEY');
    expect(ENV_VAR_MATRIX.anthropic.keyEnv).toBe('ANTHROPIC_API_KEY');
  });

  it('baseUrlEnv 形如 *_BASE_URL', () => {
    for (const t of Object.keys(ENV_VAR_MATRIX)) {
      const m = ENV_VAR_MATRIX[t as keyof typeof ENV_VAR_MATRIX];
      expect(m.baseUrlEnv).toMatch(/_BASE_URL$/);
    }
  });
});
