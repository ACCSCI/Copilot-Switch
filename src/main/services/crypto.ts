/**
 * 加密工具
 * - API Key 和 Bearer Token 用 Electron safeStorage 加密后存数据库
 * - 加密不可用时（Linux 缺 keyring 等）抛错，让用户明确知道
 */
import { safeStorage } from 'electron';

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptSecret(plain: string | null | undefined): Buffer {
  if (plain == null) return Buffer.alloc(0);
  if (typeof plain !== 'string') {
    throw new TypeError('encryptSecret: 期望 string');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统加密不可用（Linux 缺少 keyring），请配置 libsecret');
  }
  return safeStorage.encryptString(plain);
}

export function decryptSecret(cipher: Buffer | Uint8Array | null | undefined): string {
  if (!cipher) return '';
  const buf = Buffer.isBuffer(cipher) ? cipher : Buffer.from(cipher);
  if (buf.length === 0) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统加密不可用，无法解密');
  }
  return safeStorage.decryptString(buf);
}
