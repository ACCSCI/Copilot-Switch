import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync, type DatabaseSyncT } from '../db/node-sqlite';
import { setDb, closeDb } from '../db/client';
import { providerRepo } from '../db/repository';
import '../../../tests/setup/main';

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

const baseInput = {
  name: 'Test',
  type: 'openai' as const,
  baseUrl: 'https://api.openai.com/v1',
  wireApi: 'completions' as const,
  model: 'gpt-4',
};

describe('providerRepo', () => {
  let db: DatabaseSyncT;

  beforeEach(() => {
    db = freshDb();
  });

  afterEach(() => {
    clearDb();
  });

  it('list 返回空数组当无供应商', async () => {
    const list = await providerRepo.list();
    expect(list).toEqual([]);
  });

  it('create 插入并返回 DTO（脱敏）', async () => {
    const dto = await providerRepo.create(baseInput);
    expect(dto.id).toBeDefined();
    expect(dto.name).toBe('Test');
    expect(dto.hasApiKey).toBe(false);
    expect(dto.isActive).toBe(false);
    expect(dto.order).toBe(0);
  });

  it('update 修改名称和模型', async () => {
    const created = await providerRepo.create(baseInput);
    const updated = await providerRepo.update(created.id, { ...baseInput, name: 'New Name', model: 'gpt-5' });
    expect(updated.name).toBe('New Name');
    expect(updated.model).toBe('gpt-5');
  });

  it('delete 移除记录', async () => {
    const created = await providerRepo.create(baseInput);
    await providerRepo.delete(created.id);
    const list = await providerRepo.list();
    expect(list).toHaveLength(0);
  });

  it('reorder 改变 order 字段', async () => {
    const a = await providerRepo.create({ ...baseInput, name: 'A' });
    const b = await providerRepo.create({ ...baseInput, name: 'B' });
    const c = await providerRepo.create({ ...baseInput, name: 'C' });

    await providerRepo.reorder([c.id, a.id, b.id]);

    const list = await providerRepo.list();
    expect(list.map((p) => p.name)).toEqual(['C', 'A', 'B']);
  });

  it('setActive 互斥：只有一个 isActive=true', async () => {
    const a = await providerRepo.create({ ...baseInput, name: 'A' });
    const b = await providerRepo.create({ ...baseInput, name: 'B' });

    await providerRepo.setActive(a.id);
    const aRow = await providerRepo.getById(a.id);
    expect(aRow?.is_active).toBe(1);

    await providerRepo.setActive(b.id);
    expect((await providerRepo.getById(a.id))?.is_active).toBe(0);
    expect((await providerRepo.getById(b.id))?.is_active).toBe(1);
  });

  it('getActive 返回当前激活的供应商', async () => {
    const a = await providerRepo.create({ ...baseInput, name: 'A' });
    await providerRepo.setActive(a.id);
    const active = await providerRepo.getActive();
    expect(active?.name).toBe('A');
  });

  it('setEncryptedSecrets 写入加密后的 Buffer', async () => {
    const created = await providerRepo.create(baseInput);
    const secret = Buffer.from('encrypted-secret');
    await providerRepo.setEncryptedSecrets(created.id, { apiKeyEncrypted: secret });

    const raw = await providerRepo.getById(created.id);
    expect(raw?.api_key_encrypted).toEqual(secret);
    const list = await providerRepo.list();
    expect(list[0]?.hasApiKey).toBe(true);
  });
});
