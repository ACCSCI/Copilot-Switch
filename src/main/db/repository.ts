/**
 * Provider 仓储层（基于 node:sqlite + 预处理语句）
 * - 把行转成 DTO（脱敏）
 * - 提供 CRUD + reorder + activate
 */
import { getDb } from './client';
import type { ProviderRow } from './schema.sql';
import type { ProviderDTO } from '@shared/types';
import type { ProviderInput } from '@shared/schemas';
import { nanoid } from 'nanoid';

/** node:sqlite 的 BLOB 列返回 Uint8Array；统一转成 Buffer */
function toBuffer(b: Uint8Array | Buffer | null | undefined): Buffer | null {
  if (b == null) return null;
  if (Buffer.isBuffer(b)) return b;
  return Buffer.from(b);
}

function rowToProvider(r: ProviderRow): ProviderDTO {
  const apiKey = toBuffer(r.api_key_encrypted);
  const bearer = toBuffer(r.bearer_token_encrypted);
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    baseUrl: r.base_url,
    hasApiKey: apiKey != null && apiKey.length > 0,
    hasBearerToken: bearer != null && bearer.length > 0,
    wireApi: r.wire_api,
    azureApiVersion: r.azure_api_version,
    model: r.model,
    icon: r.icon,
    order: r.order,
    isActive: r.is_active === 1,
    createdAt: r.created_at * 1000,
    updatedAt: r.updated_at * 1000,
  };
}

function toRow(p: ProviderInput, id: string, now: number): Omit<ProviderRow, 'api_key_encrypted' | 'bearer_token_encrypted'> {
  return {
    id,
    name: p.name,
    type: p.type,
    base_url: p.baseUrl,
    wire_api: p.wireApi,
    azure_api_version: p.azureApiVersion ?? null,
    model: p.model,
    icon: p.icon ?? null,
    order: 0,
    is_active: 0,
    created_at: now,
    updated_at: now,
  };
}

export const providerRepo = {
  async list(): Promise<ProviderDTO[]> {
    const db = getDb();
    const stmt = db.prepare(
      'SELECT * FROM providers ORDER BY "order" ASC, created_at ASC',
    );
    const rows = stmt.all() as unknown as ProviderRow[];
    return rows.map(rowToProvider);
  },

  async getById(id: string): Promise<ProviderRow | null> {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM providers WHERE id = ?');
    const row = stmt.get(id) as Omit<ProviderRow, 'api_key_encrypted' | 'bearer_token_encrypted'> & {
      api_key_encrypted: Uint8Array | null;
      bearer_token_encrypted: Uint8Array | null;
    } | undefined;
    if (!row) return null;
    return {
      ...row,
      api_key_encrypted: toBuffer(row.api_key_encrypted),
      bearer_token_encrypted: toBuffer(row.bearer_token_encrypted),
    };
  },

  async getActive(): Promise<ProviderRow | null> {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM providers WHERE is_active = 1 LIMIT 1');
    return (stmt.get() as ProviderRow | undefined) ?? null;
  },

  async create(input: ProviderInput): Promise<ProviderDTO> {
    const db = getDb();
    const id = nanoid();
    const now = Math.floor(Date.now() / 1000);
    const row = toRow(input, id, now);
    const stmt = db.prepare(`
      INSERT INTO providers
        (id, name, type, base_url, wire_api, azure_api_version, model, icon, "order", is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      row.id,
      row.name,
      row.type,
      row.base_url,
      row.wire_api,
      row.azure_api_version,
      row.model,
      row.icon,
      row.order,
      row.is_active,
      row.created_at,
      row.updated_at,
    );
    const created = await this.getById(id);
    if (!created) throw new Error('Failed to create provider');
    return rowToProvider(created);
  },

  async update(id: string, input: ProviderInput): Promise<ProviderDTO> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      UPDATE providers SET
        name = ?, type = ?, base_url = ?, wire_api = ?,
        azure_api_version = ?, model = ?, icon = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(
      input.name,
      input.type,
      input.baseUrl,
      input.wireApi,
      input.azureApiVersion ?? null,
      input.model,
      input.icon ?? null,
      now,
      id,
    );
    const updated = await this.getById(id);
    if (!updated) throw new Error('Provider not found');
    return rowToProvider(updated);
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  },

  async setEncryptedSecrets(
    id: string,
    secrets: { apiKeyEncrypted?: Buffer | null; bearerTokenEncrypted?: Buffer | null },
  ): Promise<void> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const stmt = db.prepare(`
      UPDATE providers SET api_key_encrypted = ?, bearer_token_encrypted = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(secrets.apiKeyEncrypted ?? null, secrets.bearerTokenEncrypted ?? null, now, id);
  },

  async reorder(ids: string[]): Promise<void> {
    const db = getDb();
    db.exec('BEGIN');
    try {
      const stmt = db.prepare('UPDATE providers SET "order" = ? WHERE id = ?');
      ids.forEach((id, index) => stmt.run(index, id));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },

  async setActive(id: string): Promise<void> {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE providers SET is_active = 0').run();
      db.prepare('UPDATE providers SET is_active = 1, updated_at = ? WHERE id = ?').run(now, id);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  },
};

export { rowToProvider };
