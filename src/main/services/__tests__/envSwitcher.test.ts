import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { setDb, closeDb } from '../../db/client';
import { providerRepo } from '../../db/repository';
import { encryptSecret } from '../crypto';
import { DatabaseSync } from '../../db/node-sqlite';
import '../../../../tests/setup/main';

// mock electron
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(`enc:${s}`, 'utf-8'),
    decryptString: (b: Buffer) => b.toString('utf-8').replace(/^enc:/, ''),
  },
}));

// mock child_process.execFileSync：始终成功，记录每次调用的 (exe, args, options)
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { activateProvider, getEnvSnapshot, persistEnvVars, type PlatformPersist } from '../envSwitcher';

const execMock = vi.mocked(execFileSync);

function freshDb() {
  closeDb();
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  setDb(db);
  return db;
}

function clearDb() {
  setDb(null);
}

async function seedOpenAiProvider() {
  const dto = await providerRepo.create({
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-openai',
    model: 'gpt-4',
    wireApi: 'completions',
  });
  await providerRepo.setEncryptedSecrets(dto.id, {
    apiKeyEncrypted: encryptSecret('sk-test-openai'),
  });
  return dto.id;
}

async function seedAnthropicProvider() {
  const dto = await providerRepo.create({
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'sk-ant-test',
    model: 'claude-sonnet-4.5',
    wireApi: 'completions',
  });
  await providerRepo.setEncryptedSecrets(dto.id, {
    apiKeyEncrypted: encryptSecret('sk-ant-test'),
  });
  return dto.id;
}

async function seedAzureProvider() {
  const dto = await providerRepo.create({
    name: 'Azure',
    type: 'azure',
    baseUrl: 'https://my.openai.azure.com',
    apiKey: 'azure-key',
    azureApiVersion: '2024-10-21',
    model: 'gpt-4',
    wireApi: 'completions',
  });
  await providerRepo.setEncryptedSecrets(dto.id, {
    apiKeyEncrypted: encryptSecret('azure-key'),
  });
  return dto.id;
}

describe('envSwitcher.activateProvider', () => {
  beforeEach(async () => {
    freshDb();
    execMock.mockClear();
    execMock.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    clearDb();
  });

  it('激活 openai 供应商：设置 OPENAI_API_KEY / OPENAI_BASE_URL / COPILOT_MODEL', async () => {
    const id = await seedOpenAiProvider();
    const { env } = await activateProvider(id);

    expect(env.OPENAI_API_KEY).toBe('sk-test-openai');
    expect(env.OPENAI_BASE_URL).toBe('https://api.openai.com/v1');
    expect(env.COPILOT_MODEL).toBe('gpt-4');
    expect(process.env.OPENAI_API_KEY).toBe('sk-test-openai');
  });

  it('激活 anthropic 供应商：使用 ANTHROPIC_* 变量', async () => {
    const id = await seedAnthropicProvider();
    const { env } = await activateProvider(id);

    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test');
    expect(env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com');
    expect(env.COPILOT_MODEL).toBe('claude-sonnet-4.5');
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });

  it('激活 azure 供应商：同时设置 AZURE_API_VERSION', async () => {
    const id = await seedAzureProvider();
    const { env } = await activateProvider(id);

    expect(env.AZURE_OPENAI_KEY).toBe('azure-key');
    expect(env.AZURE_OPENAI_BASE_URL).toBe('https://my.openai.azure.com');
    // PR #2 起 azureApiVersion 写入 COPILOT_PROVIDER_AZURE_API_VERSION 命名空间
    expect(process.env.COPILOT_PROVIDER_AZURE_API_VERSION).toBe('2024-10-21');
  });

  it('切换供应商：清理上一家所有 BYOK 变量', async () => {
    const openaiId = await seedOpenAiProvider();
    const anthropicId = await seedAnthropicProvider();

    await activateProvider(openaiId);
    expect(process.env.OPENAI_API_KEY).toBeDefined();

    await activateProvider(anthropicId);
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
    expect(process.env.OPENAI_BASE_URL).toBeUndefined();
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-ant-test');
  });

  it('激活后用 reg add 持久化到用户环境（Windows execFile）', async () => {
    const id = await seedOpenAiProvider();
    // 强制 win32 平台以便断言 reg add（默认 process.platform 在 CI 不可控）
    const callsBefore = execMock.mock.calls.length;
    await activateProvider(id, { platform: 'win32', execFn: execMock as never });

    // 找到所有 reg add 调用并检查参数化传递
    const newCalls = execMock.mock.calls.slice(callsBefore);
    const regAddCalls = newCalls.filter((c) => {
      const args = c[1] as string[] | undefined;
      return c[0] === 'reg' && args?.[0] === 'add';
    });
    expect(regAddCalls.length).toBeGreaterThan(0);
    // 找到包含 OPENAI_API_KEY 的 reg add
    const openaiCall = regAddCalls.find((c) => (c[1] as string[])?.includes('OPENAI_API_KEY'));
    expect(openaiCall).toBeDefined();
    // args 形如 ['add', 'HKCU\\Environment', '/v', 'OPENAI_API_KEY', '/t', 'REG_SZ', '/d', value, '/f']
    const openaiArgs = openaiCall?.[1] as string[];
    expect(openaiArgs).toContain('OPENAI_API_KEY');
    expect(openaiArgs).toContain('sk-test-openai');
  });

  it('切换后用 reg delete 清理掉之前残留的变量', async () => {
    const openaiId = await seedOpenAiProvider();
    const anthropicId = await seedAnthropicProvider();

    await activateProvider(openaiId, { platform: 'win32', execFn: execMock as never });
    execMock.mockClear();
    await activateProvider(anthropicId, { platform: 'win32', execFn: execMock as never });

    // 应有 OPENAI_API_KEY 的 reg delete
    const regDelete = execMock.mock.calls.find((c) => {
      const args = c[1] as string[] | undefined;
      return (
        c[0] === 'reg' && args?.[0] === 'delete' && args?.includes('OPENAI_API_KEY')
      );
    });
    expect(regDelete).toBeDefined();
  });

  it('不存在的 providerId 抛错', async () => {
    await expect(activateProvider('non-existent')).rejects.toThrow(/not found/i);
  });

  it('激活后将 isActive 持久化到数据库', async () => {
    const id = await seedOpenAiProvider();
    await activateProvider(id);
    const active = await providerRepo.getActive();
    expect(active?.id).toBe(id);
  });
});

describe('envSwitcher.persistEnvVars', () => {
  beforeEach(() => {
    execMock.mockClear();
    execMock.mockReturnValue(Buffer.from(''));
  });

  it('Windows 平台用 reg add 持久化', () => {
    const persist: PlatformPersist = { platform: 'win32', execFn: execMock as never };
    persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    expect(execMock).toHaveBeenCalled();
    // 首参 exe='reg'，次参 args 数组包含 /d 'sk-test'
    const call = execMock.mock.calls[0] as readonly [unknown, ...unknown[]];
    const exe = call[0];
    const args = call[1] as string[];
    expect(exe).toBe('reg');
    expect(args).toContain('add');
    expect(args).toContain('sk-test');
  });

  it('空值时调用 reg delete', () => {
    const persist: PlatformPersist = { platform: 'win32', execFn: execMock as never };
    persistEnvVars({ OPENAI_API_KEY: '' }, persist);
    const call = execMock.mock.calls[0] as readonly [unknown, ...unknown[]];
    const exe = call[0];
    const args = call[1] as string[];
    expect(exe).toBe('reg');
    expect(args).toContain('delete');
    expect(args).toContain('OPENAI_API_KEY');
  });

  it('非 Windows 平台用 launchctl setenv（macOS）', () => {
    const persist: PlatformPersist = { platform: 'darwin', execFn: execMock as never };
    persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    const call = execMock.mock.calls[0] as readonly [unknown, ...unknown[]];
    const exe = call[0];
    const args = call[1] as string[];
    expect(exe).toBe('launchctl');
    expect(args).toContain('setenv');
    expect(args).toContain('sk-test');
  });

  it('macOS 空值时调用 launchctl unsetenv', () => {
    const persist: PlatformPersist = { platform: 'darwin', execFn: execMock as never };
    persistEnvVars({ OPENAI_API_KEY: '' }, persist);
    const call = execMock.mock.calls[0] as readonly [unknown, ...unknown[]];
    const exe = call[0];
    const args = call[1] as string[];
    expect(exe).toBe('launchctl');
    expect(args).toContain('unsetenv');
  });

  it('Linux 跳过持久化（无统一方案）', () => {
    const persist: PlatformPersist = { platform: 'linux', execFn: execMock as never };
    persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    expect(execMock).not.toHaveBeenCalled();
  });

  it('exec 失败不抛错（被 try/catch 吞掉）', () => {
    execMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const persist: PlatformPersist = { platform: 'win32', execFn: execMock as never };
    expect(() => persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist)).not.toThrow();
  });

  it('特殊字符作为独立 args 元素传入（不经过 shell 解释）', () => {
    // 验证：值含 shell 特殊字符（%、&、$、`）也能安全传递
    const persist: PlatformPersist = { platform: 'win32', execFn: execMock as never };
    const dangerous = 'sk-pwn%PATH%&whoami`evil`';
    persistEnvVars({ OPENAI_API_KEY: dangerous }, persist);
    const call = execMock.mock.calls[0] as readonly [unknown, ...unknown[]];
    const exe = call[0];
    const args = call[1] as string[];
    // 整个 value 必须作为单个 args 元素出现，证明没被 shell 拼接
    expect(exe).toBe('reg');
    expect(args).toContain(dangerous);
  });
});

describe('envSwitcher.getEnvSnapshot', () => {
  it('返回当前 process.env 的 BYOK 部分', () => {
    process.env.OPENAI_API_KEY = 'x';
    process.env.ANTHROPIC_API_KEY = 'y';
    process.env.UNRELATED = 'z';

    const snap = getEnvSnapshot();

    expect(snap.OPENAI_API_KEY).toBe('x');
    expect(snap.ANTHROPIC_API_KEY).toBe('y');
    expect((snap as Record<string, unknown>).UNRELATED).toBeUndefined();
  });
});