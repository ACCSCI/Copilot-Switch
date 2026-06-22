/**
 * envSwitcher：Copilot BYOK 环境变量切换核心
 *
 * 流程：
 * 1. 读取并解密 provider
 * 2. 清空所有 BYOK 变量
 * 3. 根据 type 设置对应变量
 * 4. 持久化到用户环境（Windows reg add / macOS launchctl）
 * 5. 标记为 isActive
 * 6. 通知渲染层
 */
import { execFileSync } from 'node:child_process';
import { ENV_VAR_MATRIX, ALL_BYOK_ENV_VARS, type EnvVarMap } from '@shared/schemas';
import type { EnvSnapshot, ProviderDTO } from '@shared/types';
import { providerRepo } from '../db/repository';
import { decryptSecret } from './crypto';
import { logger } from '../logger';

export interface PlatformPersist {
  platform: NodeJS.Platform;
  execFn: typeof execFileSync;
}

/** 默认持久化执行器（可注入便于测试） */
const defaultPersist: PlatformPersist = {
  platform: process.platform,
  execFn: execFileSync,
};

/** 把所有 BYOK 变量清空（process.env + 持久化） */
export function clearAllByokEnv(persist: PlatformPersist = defaultPersist) {
  for (const k of ALL_BYOK_ENV_VARS) {
    delete process.env[k];
  }
  persistEnvVars(
    Object.fromEntries(ALL_BYOK_ENV_VARS.map((k) => [k, ''])),
    persist,
  );
}

/** 持久化一组环境变量到用户级（同步） */
export function persistEnvVars(
  vars: EnvVarMap,
  persist: PlatformPersist = defaultPersist,
): void {
  for (const [key, value] of Object.entries(vars)) {
    runPersist(key, value, persist);
  }
}

function runPersist(key: string, value: string, persist: PlatformPersist): void {
  const cmd = buildPersistCommand(persist.platform, key, value);
  if (!cmd) return;
  try {
    persist.execFn(cmd.exe, cmd.args, { stdio: 'ignore', timeout: 5000 });
  } catch {
    // 持久化失败不阻塞激活（process.env 已设置）
  }
}

function buildPersistCommand(
  platform: NodeJS.Platform,
  key: string,
  value: string,
): { exe: string; args: string[] } | null {
  if (platform === 'win32') {
    if (!value) {
      // 删除：reg delete "HKCU\Environment" /v KEY /f
      return {
        exe: 'reg',
        args: ['delete', 'HKCU\\Environment', '/v', key, '/f'],
      };
    }
    // 写入：reg add "HKCU\Environment" /v KEY /t REG_SZ /d VALUE /f
    // 使用 execFileSync 避免 cmd.exe 解释特殊字符（%、&、^ 等）
    return {
      exe: 'reg',
      args: ['add', 'HKCU\\Environment', '/v', key, '/t', 'REG_SZ', '/d', value, '/f'],
    };
  }
  if (platform === 'darwin') {
    if (!value) {
      return { exe: 'launchctl', args: ['unsetenv', key] };
    }
    return { exe: 'launchctl', args: ['setenv', key, value] };
  }
  // Linux: 暂不持久化
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

  // 1) 清空所有 BYOK 变量
  clearAllByokEnv(persist);

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

  // 3) 构建 env map 并设置 process.env
  const toPersist = buildEnvVars(provider, apiKey, bearerToken);
  for (const [k, v] of Object.entries(toPersist)) {
    process.env[k] = v;
  }

  // 4) 持久化到用户环境（同步，确保写入完成）
  persistEnvVars(toPersist, persist);

  // 5) 标记 active（必须执行，不受持久化影响）
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

/**
 * 根据 provider 构建需要设置的环境变量 map。
 * 使用 ENV_VAR_MATRIX 统一命名（COPILOT_PROVIDER_* 命名空间）。
 */
function buildEnvVars(
  provider: { type: string; base_url: string; model: string; wire_api: string; azure_api_version?: string | null },
  apiKey: string,
  bearerToken: string,
): EnvVarMap {
  const map: EnvVarMap = {};
  const matrix = ENV_VAR_MATRIX[provider.type as keyof typeof ENV_VAR_MATRIX];

  // Base URL（所有 type 共用）
  map[matrix.baseUrlEnv] = provider.base_url;

  // Provider type（所有 type 都设）
  if ('typeEnv' in matrix) {
    Object.assign(map, matrix.typeEnv);
  }

  // API Key 或 Bearer Token（二选一）
  if (bearerToken) {
    map['COPILOT_PROVIDER_BEARER_TOKEN'] = bearerToken;
  } else if (apiKey) {
    map[matrix.keyEnv] = apiKey;
  }

  // Model（Copilot CLI 读取 COPILOT_MODEL）
  map['COPILOT_MODEL'] = provider.model;

  // Wire API
  map['COPILOT_PROVIDER_WIRE_API'] = provider.wire_api;

  // Azure 额外变量
  if (provider.type === 'azure' && provider.azure_api_version) {
    map['COPILOT_PROVIDER_AZURE_API_VERSION'] = provider.azure_api_version;
  }

  return map;
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
