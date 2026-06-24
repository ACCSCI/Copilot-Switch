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
import { logger } from '../logger';

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
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      logger.warn('persist timeout, resolving anyway', { key, cmd });
      resolve();
    }, 2000);
    persist.execFn(cmd, (err) => {
      clearTimeout(timer);
      if (err && !timedOut) {
        logger.warn('persist failed', { key, cmd, error: err.message });
      }
      resolve();
    });
  });
}

function buildPersistCommand(platform: NodeJS.Platform, key: string, value: string): string | null {
  if (platform === 'win32') {
    if (!value) {
      return `reg delete "HKCU\\Environment" /v ${key} /f`;
    }
    const safe = value.replace(/"/g, '');
    return `setx ${key} "${safe}"`;
  }
  if (platform === 'darwin') {
    if (!value) {
      return `launchctl unsetenv "${key}"`;
    }
    return `launchctl setenv "${key}" "${value.replace(/"/g, '\\"')}"`;
  }
  return null;
}

/** 激活指定 provider */
export async function activateProvider(
  providerId: string,
  persist: PlatformPersist = defaultPersist,
): Promise<{ env: EnvSnapshot }> {
  logger.info('activateProvider start', { id: providerId });

  const provider = await providerRepo.getById(providerId);
  if (!provider) {
    logger.warn('activateProvider: provider not found', { id: providerId });
    throw new Error(`Provider not found: ${providerId}`);
  }

  // 1) 清空
  await clearAllByokEnv(persist);

  // 2) 解密 secrets
  let apiKey = '';
  let bearerToken = '';
  try {
    apiKey = provider.api_key_encrypted ? decryptSecret(provider.api_key_encrypted) : '';
    bearerToken = provider.bearer_token_encrypted ? decryptSecret(provider.bearer_token_encrypted) : '';
  } catch (e) {
    logger.error('activateProvider: decrypt failed', {
      id: providerId,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

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
  await persistEnvVars(toPersist, persist).catch((e) => {
    logger.warn('persistEnvVars failed but continuing', {
      id: providerId,
      error: e instanceof Error ? e.message : String(e),
    });
  });

  // 5) 标记 active
  try {
    await providerRepo.setActive(providerId);
  } catch (e) {
    logger.error('setActive failed', {
      id: providerId,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }

  logger.info('activateProvider success', {
    id: providerId,
    name: provider.name,
    type: provider.type,
    envKeys: Object.keys(toPersist),
  });

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