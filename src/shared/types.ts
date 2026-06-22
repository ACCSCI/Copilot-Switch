/**
 * 跨进程共享的 TypeScript 类型
 * 不要在这里 import 任何运行时重的依赖（如 better-sqlite3）
 */
import type { ProviderType, WireApi } from './schemas';

export interface ProviderDTO {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  /** API Key 脱敏后的占位（前端只用来显示 "已设置"） */
  hasApiKey: boolean;
  hasBearerToken: boolean;
  wireApi: WireApi;
  azureApiVersion: string | null;
  model: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HealthCheckDTO {
  id: string;
  providerId: string;
  status: 'ok' | 'fail' | 'pending';
  latencyMs: number | null;
  error: string | null;
  checkedAt: number;
}

export interface UsageStatDTO {
  id: string;
  providerId: string;
  model: string | null;
  latencyMs: number;
  success: boolean;
  recordedAt: number;
}

export interface EnvSnapshot {
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  AZURE_OPENAI_KEY?: string;
  AZURE_OPENAI_BASE_URL?: string;
  AZURE_API_VERSION?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_BASE_URL?: string;
  COPILOT_MODEL?: string;
  COPILOT_WIRE_API?: string;
}

/** 渲染层可见的 IPC API */
export interface RendererApi {
  providers: {
    list(): Promise<ProviderDTO[]>;
    create(input: import('./schemas').ProviderInput): Promise<ProviderDTO>;
    update(id: string, input: import('./schemas').ProviderInput): Promise<ProviderDTO>;
    delete(id: string): Promise<void>;
    reorder(ids: string[]): Promise<void>;
    activate(id: string): Promise<{ env: EnvSnapshot }>;
  };
  health: {
    check(id: string): Promise<import('./schemas').PingResult>;
    history(id: string): Promise<HealthCheckDTO[]>;
  };
  testProvider: {
    ping(id: string): Promise<import('./schemas').PingResult>;
  };
  system: {
    getEnvSnapshot(): Promise<EnvSnapshot>;
    openLogDir(): Promise<void>;
  };
  cli: {
    openTerminal(): Promise<void>;
  };
}

declare global {
  interface Window {
    api: RendererApi;
  }
}
