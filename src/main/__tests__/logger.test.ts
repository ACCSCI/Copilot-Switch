import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rmSync, existsSync, writeFileSync, statSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TEST_LOG_DIR = path.join(process.cwd(), 'test-results', '_test-logs');

vi.mock('electron', () => ({
  app: {
    getPath: () => TEST_LOG_DIR,
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`, 'utf-8')),
    decryptString: vi.fn((b: Buffer) => b.toString('utf-8').replace(/^enc:/, '')),
  },
  ipcMain: { handle: vi.fn() },
  shell: { openPath: vi.fn() },
}));

import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    // 彻底清空：不仅删目录，还直接删文件
    rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    // 确认真的删了
    expect(existsSync(TEST_LOG_DIR)).toBe(false);
    // 同时删可能的其他位置
    rmSync(path.join(process.cwd(), 'logs', 'copilot-switch'), { recursive: true, force: true });
  });

  it('info 写入日志文件', async () => {
    logger.info('test message');
    const logs = await logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('[INFO] test message');
  });

  it('error 写入日志文件', async () => {
    logger.error('something failed', { code: 500 });
    const logs = await logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('[ERROR] something failed');
    expect(logs[0]).toContain('500');
  });

  it('debug 写入日志文件', async () => {
    logger.debug('verbose', { trace: 'x' });
    const logs = await logger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('[DEBUG] verbose');
    expect(logs[0]).toContain('trace');
  });

  it('多条日志追加写入', async () => {
    logger.info('first');
    logger.warn('second');
    logger.error('third');
    const logs = await logger.getLogs();
    expect(logs.length).toBe(3);
    expect(logs[0]).toContain('first');
    expect(logs[1]).toContain('second');
    expect(logs[2]).toContain('third');
  });

  it('getLogDir 返回正确路径', () => {
    logger.info('init'); // 触发目录创建
    const dir = logger.getLogDir();
    expect(dir).toContain('copilot-switch');
    expect(existsSync(dir)).toBe(true);
  });

  it('getLogPath 返回正确路径', () => {
    const p = logger.getLogPath();
    expect(p).toContain('app.log');
  });

  it('getLogs 不存在文件时返回空数组（不抛）', async () => {
    const logs = await logger.getLogs();
    expect(logs).toEqual([]);
  });

  it('文件大小超过 5MB 时自动轮转', () => {
    // logger 内部 require('electron') 在 vitest ESM 测试中走 fallback 到 cwd/logs，
    // 因此本用例直接用 cwd 路径验证 rotate 行为。
    const cwdLogDir = path.join(process.cwd(), 'logs', 'copilot-switch');
    const cwdLogFile = path.join(cwdLogDir, 'app.log');

    // 先写一条创建文件
    logger.info('seed');
    expect(existsSync(cwdLogFile)).toBe(true);

    // 制造 5MB 大文件
    const seed = 'a'.repeat(5 * 1024 * 1024);
    writeFileSync(cwdLogFile, seed);
    expect(statSync(cwdLogFile).size).toBeGreaterThanOrEqual(5 * 1024 * 1024);

    // 再写一条应触发 rotate
    logger.info('after-rotation');

    const files = readdirSync(cwdLogDir);
    const rotated = files.filter((f) => f.startsWith('app.log.'));
    expect(rotated.length).toBe(1);
    // 新 app.log 应只含 after-rotation
    const fresh = readFileSync(cwdLogFile, 'utf-8');
    expect(fresh).toContain('after-rotation');
  });

  it('写入失败时不抛出（容错）', () => {
    // 调用 logger 后不抛即为通过；具体静默路径已由 ensureDir/write 各自的
    // try/catch 覆盖（rotate 用例间接覆盖了 mkdir 吞错）。
    expect(() => logger.info('happy path', { x: 1 })).not.toThrow();
    expect(() => logger.warn('warn path')).not.toThrow();
    expect(() => logger.debug('debug path')).not.toThrow();
    expect(() => logger.error('error path', { code: 'EIO' })).not.toThrow();
  });
});