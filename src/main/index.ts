import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { logger } from './logger';
import { createWindow } from './window';
import { registerAllIpc } from './ipc';
import { runMigrations, getDb } from './db/client';
import { providerRepo } from './db/repository';
import { activateProvider } from './services/envSwitcher';

void path;

logger.info('app starting', { platform: process.platform, version: app.getVersion() });

// 单实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  logger.info('another instance running, quitting');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  logger.info('second instance detected, focusing window');
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(async () => {
  // 1) 初始化 DB
  logger.info('initializing database');
  getDb();
  runMigrations();
  logger.info('database initialized');

  // 2) 注册 IPC
  registerAllIpc();
  logger.info('IPC handlers registered');

  // 3) 启动时恢复上次激活的供应商
  try {
    const active = await providerRepo.getActive();
    if (active) {
      logger.info('restoring active provider', { id: active.id, name: active.name, type: active.type });
      await activateProvider(active.id);
      logger.info('active provider restored successfully');
    } else {
      logger.info('no active provider to restore');
    }
  } catch (e) {
    logger.error('failed to restore active provider', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // 4) 创建窗口
  createWindow();
  logger.info('window created');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('all windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 防止未捕获异常
process.on('uncaughtException', (e) => {
  logger.error('uncaughtException', {
    error: e.message,
    stack: e.stack?.split('\n').slice(0, 5).join('\n'),
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
