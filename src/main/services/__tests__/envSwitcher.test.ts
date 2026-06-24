import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'node:child_process';
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

// mock child_process.exec
vi.mock('node:child_process', () => ({
  exec: vi.fn((_cmd: string, cb: (err: null) => void) => cb(null)),
}));

import { activateProvider, getEnvSnapshot, persistEnvVars, type PlatformPersist } from '../envSwitcher';

const execMock = vi.mocked(exec);

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
    expect(env.AZURE_API_VERSION).toBe('2024-10-21');
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

  it('激活后调用 setx 持久化到用户环境', async () => {
    const id = await seedOpenAiProvider();
    await activateProvider(id);

    const calls = execMock.mock.calls.map((c) => c[0] as string);
    console.log('ALL CALLS:', calls);
    expect(calls.some((c) => c.startsWith('setx OPENAI_API_KEY'))).toBe(true);
    expect(calls.some((c) => c.startsWith('setx OPENAI_BASE_URL'))).toBe(true);
    expect(calls.some((c) => c.startsWith('setx COPILOT_MODEL'))).toBe(true);
  });

  it('切换后用 setx 清理掉之前残留的变量', async () => {
    const openaiId = await seedOpenAiProvider();
    const anthropicId = await seedAnthropicProvider();

    await activateProvider(openaiId);
    execMock.mockClear();
    await activateProvider(anthropicId);

    const calls = execMock.mock.calls.map((c) => c[0] as string);
    expect(calls.some((c) => c.includes('OPENAI_API_KEY') && c.includes('reg delete'))).toBe(true);
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
  });

  it('Windows 平台用 setx', async () => {
    const platform = 'win32';
    const persist: PlatformPersist = { platform, execFn: execMock as never };
    await persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    expect(execMock).toHaveBeenCalled();
    const cmd = execMock.mock.calls[0]?.[0] as string;
    expect(cmd).toMatch(/^setx OPENAI_API_KEY/);
  });

  it('空值时调用 reg delete', async () => {
    const persist: PlatformPersist = { platform: 'win32', execFn: execMock as never };
    await persistEnvVars({ OPENAI_API_KEY: '' }, persist);
    const cmd = execMock.mock.calls[0]?.[0] as string;
    expect(cmd).toMatch(/^reg delete/);
  });

  it('非 Windows 平台用 launchctl setenv（macOS）', async () => {
    const persist: PlatformPersist = { platform: 'darwin', execFn: execMock as never };
    await persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    const cmd = execMock.mock.calls[0]?.[0] as string;
    expect(cmd).toMatch(/^launchctl setenv/);
  });

  it('Linux 跳过持久化（无统一方案）', async () => {
    const persist: PlatformPersist = { platform: 'linux', execFn: execMock as never };
    await persistEnvVars({ OPENAI_API_KEY: 'sk-test' }, persist);
    expect(execMock).not.toHaveBeenCalled();
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
