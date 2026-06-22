import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createWindow } from './window';
import { registerAllIpc } from './ipc';
import { runMigrations, getDb } from './db/client';
import { providerRepo } from './db/repository';
import { activateProvider } from './services/envSwitcher';

// path imported for completeness; not used at top level
void path;

// 单实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(async () => {
  // 1) 初始化 DB
  getDb();
  runMigrations();

  // 2) 注册 IPC
  registerAllIpc();

  // 3) 启动时恢复上次激活的供应商
  try {
    const active = await providerRepo.getActive();
    if (active) {
      await activateProvider(active.id);
    }
  } catch (e) {
    console.error('[main] 恢复激活供应商失败', e);
  }

  // 4) 创建窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 防止未捕获异常
process.on('uncaughtException', (e) => {
  console.error('[main] uncaughtException', e);
});
