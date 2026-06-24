/**
 * Preload：暴露安全的 IPC API 到 window.api
 * - contextIsolation: true
 * - 不直接暴露 ipcRenderer
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { ProviderInput, PingResult, ActivateProviderInput } from '@shared/schemas';
import type { ProviderDTO, HealthCheckDTO, EnvSnapshot, ProviderSecrets, RendererApi } from '@shared/types';

const api: RendererApi = {
  providers: {
    list: () => ipcRenderer.invoke('providers:list') as Promise<ProviderDTO[]>,
    create: (input: ProviderInput) => ipcRenderer.invoke('providers:create', input) as Promise<ProviderDTO>,
    update: (id: string, input: ProviderInput) =>
      ipcRenderer.invoke('providers:update', id, input) as Promise<ProviderDTO>,
    delete: (id: string) => ipcRenderer.invoke('providers:delete', id) as Promise<void>,
    reorder: (ids: string[]) => ipcRenderer.invoke('providers:reorder', ids) as Promise<void>,
    activate: (id: string) => {
      const payload: ActivateProviderInput = { providerId: id };
      return ipcRenderer.invoke('providers:activate', payload) as Promise<{ env: EnvSnapshot }>;
    },
    getSecrets: (id: string) =>
      ipcRenderer.invoke('providers:getSecrets', id) as Promise<ProviderSecrets>,
  },
  health: {
    check: (id: string) => ipcRenderer.invoke('health:check', id) as Promise<PingResult>,
    history: (id: string) => ipcRenderer.invoke('health:history', id) as Promise<HealthCheckDTO[]>,
  },
  testProvider: {
    ping: (id: string) => ipcRenderer.invoke('testProvider:ping', id) as Promise<PingResult>,
  },
  system: {
    getEnvSnapshot: () => ipcRenderer.invoke('system:getEnvSnapshot') as Promise<EnvSnapshot>,
    openLogDir: () => ipcRenderer.invoke('system:openLogDir') as Promise<void>,
    getLogs: () => ipcRenderer.invoke('system:getLogs') as Promise<string[]>,
    getLogPath: () => ipcRenderer.invoke('system:getLogPath') as Promise<string>,
  },
};

contextBridge.exposeInMainWorld('api', api);
