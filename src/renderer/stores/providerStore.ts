/**
 * Provider Store：缓存供应商列表，支持乐观更新
 */
import { create } from 'zustand';
import type { ProviderDTO } from '@shared/types';

interface ProviderState {
  providers: ProviderDTO[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  activate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  upsert: (dto: ProviderDTO) => void;
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: [],
  loading: false,
  error: null,

  async fetch() {
    set({ loading: true, error: null });
    try {
      const list = await window.api.providers.list();
      set({ providers: list, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  async activate(id) {
    try {
      await window.api.providers.activate(id);
    } finally {
      // 无论 IPC 成功/失败都刷新列表（避免 UI 卡在旧状态）
      await get().fetch();
    }
  },

  async remove(id) {
    await window.api.providers.delete(id);
    set({ providers: get().providers.filter((p) => p.id !== id) });
  },

  async reorder(ids) {
    set({ providers: get().providers.slice().sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) });
    await window.api.providers.reorder(ids);
  },

  upsert(dto) {
    const list = get().providers.slice();
    const i = list.findIndex((p) => p.id === dto.id);
    if (i >= 0) list[i] = dto;
    else list.push(dto);
    set({ providers: list });
  },
}));
