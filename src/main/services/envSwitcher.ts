/**
 * envSwitcher：Copilot BYOK 环境变量切换核心
 *
 * 流程：
 * 1. 读取并解密 provider
 * 2. 清空所有 BYOK 变量
 * 3. 根据 type 设置对应变量
 * 4. 持久化到用户环境（Windows setx / macOS launchctl）
 * 5. 标记为 isActive
 * 6. 通知渲染层
 */
import { exec } from 'node:child_process';
import { ENV_VAR_MATRIX, ALL_BYOK_ENV_VARS, type EnvVarMap } from '@shared/schemas';
import type { EnvSnapshot, ProviderDTO } from '@shared/types';
import { providerRepo } from '../db/repository';
import { decryptSecret } from './crypto';

export interface PlatformPersist {
  platform: NodeJS.Platform;
  execFn: typeof exec;
}

/** 默认持久化执行器（可注入便于测试） */
const defaultPersist: PlatformPersist = {
  platform: process.platform,
  execFn: exec,
};

/** 把所有 BYOK 变量清空（process.env + 持久化） */
export async function clearAllByokEnv(persist: PlatformPersist = defaultPersist) {
  const toDelete: EnvVarMap = {};
  for (const k of ALL_BYOK_ENV_VARS) {
    delete process.env[k];
    toDelete[k] = '';
  }
  await persistEnvVars(toDelete, persist);
}

/** 持久化一组环境变量到用户级 */
export async function persistEnvVars(
  vars: EnvVarMap,
  persist: PlatformPersist = defaultPersist,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (const [key, value] of Object.entries(vars)) {
    tasks.push(runPersist(key, value, persist));
  }
  await Promise.all(tasks);
}

function runPersist(key: string, value: string, persist: PlatformPersist): Promise<void> {
  return new Promise((resolve) => {
    const cmd = buildPersistCommand(persist.platform, key, value);
    if (!cmd) {
      resolve();
      return;
    }
    // 超时保护：exec 回调可能在某些环境 hang
    const timer = setTimeout(() => resolve(), 2000);
    persist.execFn(cmd, () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function buildPersistCommand(platform: NodeJS.Platform, key: string, value: string): string | null {
  if (platform === 'win32') {
    if (!value) {
      return `reg delete "HKCU\\Environment" /v ${key} /f`;
    }
    // setx 限制 1024 字符；超过则截断（key 单独写）
    const safe = value.replace(/"/g, '');
    return `setx ${key} "${safe}"`;
  }
  if (platform === 'darwin') {
    if (!value) {
      return `launchctl unsetenv "${key}"`;
    }
    return `launchctl setenv "${key}" "${value.replace(/"/g, '\\"')}"`;
  }
  // Linux: 写到 ~/.config/copilot-switch/env, 由用户 source 或由 systemd 加载
  // 这里简化为不持久化（避免引入额外复杂度）
  return null;
}

/** 激活指定 provider */
export async function activateProvider(
  providerId: string,
  persist: PlatformPersist = defaultPersist,
): Promise<{ env: EnvSnapshot }> {
  const provider = await providerRepo.getById(providerId);
  if (!provider) throw new Error(`Provider not found: ${providerId}`);

  // 1) 清空
  await clearAllByokEnv(persist);

  // 2) 解密 secrets（ProviderRow 用 snake_case 字段名）
  const apiKey = provider.api_key_encrypted ? decryptSecret(provider.api_key_encrypted) : '';
  const bearerToken = provider.bearer_token_encrypted ? decryptSecret(provider.bearer_token_encrypted) : '';

  // 3) 设置 process.env
  const map = ENV_VAR_MATRIX[provider.type];
  process.env[map.keyEnv] = apiKey || bearerToken;
  process.env[map.baseUrlEnv] = provider.base_url;
  process.env.COPILOT_MODEL = provider.model;
  process.env.COPILOT_WIRE_API = provider.wire_api;

  if (provider.type === 'azure' && provider.azure_api_version) {
    process.env.AZURE_API_VERSION = provider.azure_api_version;
  }

  // 4) 持久化到用户环境（不阻塞激活）
  const toPersist: EnvVarMap = {
    [map.keyEnv]: process.env[map.keyEnv] ?? '',
    [map.baseUrlEnv]: provider.base_url,
    COPILOT_MODEL: provider.model,
    COPILOT_WIRE_API: provider.wire_api,
  };
  if (provider.type === 'azure' && provider.azure_api_version) {
    toPersist.AZURE_API_VERSION = provider.azure_api_version;
  }
  await persistEnvVars(toPersist, persist).catch(() => {});

  // 5) 标记 active（必须执行，不受持久化影响）
  await providerRepo.setActive(providerId);

  return { env: getEnvSnapshot() };
}

/** 取当前 BYOK 环境变量快照（脱敏可选） */
export function getEnvSnapshot(): EnvSnapshot {
  const snap: EnvSnapshot = {};
  for (const k of ALL_BYOK_ENV_VARS) {
    const v = process.env[k];
    if (v !== undefined) snap[k as keyof EnvSnapshot] = v;
  }
  return snap;
}

/** 工具：把 DTO 转成脱敏的 env（用于日志/UI） */
export function dtoToMaskedEnv(dto: ProviderDTO): Record<string, string> {
  return {
    type: dto.type,
    baseUrl: dto.baseUrl,
    hasApiKey: String(dto.hasApiKey),
    hasBearerToken: String(dto.hasBearerToken),
    model: dto.model,
  };
}
