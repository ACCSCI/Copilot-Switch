import { ipcMain } from 'electron';
import { providerRepo } from '../db/repository';
import { pingProvider } from '../services/healthChecker';
import { getDb } from '../db/client';
import { nanoid } from 'nanoid';
import type { HealthCheckDTO } from '@shared/types';
import type { HealthCheckRow } from '../db/schema.sql';

function toDto(row: HealthCheckRow): HealthCheckDTO {
  return {
    id: row.id,
    providerId: row.provider_id,
    status: row.status,
    latencyMs: row.latency_ms,
    error: row.error,
    checkedAt: row.checked_at * 1000,
  };
}

export function registerHealthIpc() {
  ipcMain.handle('health:check', async (_e, providerId: string, shallow = false) => {
    const provider = await providerRepo.getById(providerId);
    if (!provider) throw new Error('Provider not found');
    const result = await pingProvider(provider, { shallowOnly: shallow });
    const db = getDb();
    db.prepare(
      'INSERT INTO health_checks (id, provider_id, status, latency_ms, error) VALUES (?, ?, ?, ?, ?)',
    ).run(
      nanoid(),
      providerId,
      result.ok ? 'ok' : 'fail',
      result.latencyMs,
      result.error ?? null,
    );
    return result;
  });

  ipcMain.handle('health:history', async (_e, providerId: string, limit = 20) => {
    const db = getDb();
    const rows = db
      .prepare(
        'SELECT * FROM health_checks WHERE provider_id = ? ORDER BY checked_at DESC LIMIT ?',
      )
      .all(providerId, limit) as unknown as HealthCheckRow[];
    return rows.map(toDto);
  });
}
