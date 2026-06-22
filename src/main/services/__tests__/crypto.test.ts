import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron BEFORE any imports
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((s: string) => Buffer.from(`enc:${s}`, 'utf-8')),
    decryptString: vi.fn((b: Buffer) => b.toString('utf-8').replace(/^enc:/, '')),
  },
  app: { getPath: () => '/tmp' },
}));

import { encryptSecret, decryptSecret, isEncryptionAvailable } from '../crypto';
import '../../../../tests/setup/main';

// Access the mock via the imported module
import { safeStorage } from 'electron';
const ss = safeStorage as unknown as {
  isEncryptionAvailable: ReturnType<typeof vi.fn>;
  encryptString: ReturnType<typeof vi.fn>;
  decryptString: ReturnType<typeof vi.fn>;
};

describe('crypto service', () => {
  beforeEach(() => {
    ss.isEncryptionAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isEncryptionAvailable 委托给 safeStorage', () => {
    expect(isEncryptionAvailable()).toBe(true);
    ss.isEncryptionAvailable.mockReturnValue(false);
    expect(isEncryptionAvailable()).toBe(false);
  });

  it('encryptSecret 返回 Buffer', () => {
    const enc = encryptSecret('sk-test');
    expect(Buffer.isBuffer(enc)).toBe(true);
    expect(enc.toString('utf-8')).toBe('enc:sk-test');
  });

  it('decryptSecret 反向解密', () => {
    const enc = encryptSecret('my-api-key');
    expect(decryptSecret(enc)).toBe('my-api-key');
  });

  it('encryptSecret 接受空字符串', () => {
    expect(() => encryptSecret('')).not.toThrow();
  });

  it('encryptSecret 拒绝非字符串非空值', () => {
    expect(() => encryptSecret(123 as unknown as string)).toThrow();
  });

  it('encryption unavailable 时抛错', () => {
    ss.isEncryptionAvailable.mockReturnValue(false);
    expect(() => encryptSecret('x')).toThrow(/系统加密不可用/);
  });
});
