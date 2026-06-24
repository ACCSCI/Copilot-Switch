/**
 * 轻量日志模块
 * - 写入 app.getPath('logs')/copilot-switch/app.log
 * - 支持 info/warn/error/debug 四个级别
 * - 5MB 自动轮转
 * - 读取走异步 fs.promises，避免阻塞 Electron 主线程
 */
import { appendFileSync, mkdirSync, statSync, renameSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// 懒加载 Electron app（避免模块级别 require electron）
let _logDir: string | null = null;
function getLogDir(): string {
  if (_logDir) return _logDir;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron');
    _logDir = path.join(app.getPath('logs'), 'copilot-switch');
  } catch {
    _logDir = path.join(process.cwd(), 'logs', 'copilot-switch');
  }
  return _logDir;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function ensureDir(dir: string) {
  try { mkdirSync(dir, { recursive: true }); } catch {}
}

function rotateIfNeeded(filePath: string) {
  try {
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      if (stat.size >= MAX_SIZE) {
        renameSync(filePath, filePath + '.' + Date.now());
      }
    }
  } catch {}
}

function write(level: string, msg: string, data?: Record<string, unknown>) {
  const logDir = getLogDir();
  const logFile = path.join(logDir, 'app.log');
  ensureDir(logDir);
  rotateIfNeeded(logFile);
  const ts = new Date().toISOString();
  const line = data
    ? `${ts} [${level}] ${msg} ${JSON.stringify(data)}`
    : `${ts} [${level}] ${msg}`;
  try {
    appendFileSync(logFile, line + '\n');
  } catch {}
}

export const logger = {
  info:  (msg: string, data?: Record<string, unknown>) => write('INFO', msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => write('WARN', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write('ERROR', msg, data),
  debug: (msg: string, data?: Record<string, unknown>) => write('DEBUG', msg, data),

  /** 异步读取日志，避免阻塞主线程（最大 5MB，split 后返回） */
  async getLogs(): Promise<string[]> {
    const logFile = path.join(getLogDir(), 'app.log');
    try {
      const content = await readFile(logFile, 'utf-8');
      return content.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  },

  getLogDir(): string {
    return getLogDir();
  },

  getLogPath(): string {
    return path.join(getLogDir(), 'app.log');
  },
};
