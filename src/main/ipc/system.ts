import { ipcMain, app, shell } from 'electron';
import { getEnvSnapshot } from '../services/envSwitcher';
import path from 'node:path';

export function registerSystemIpc() {
  ipcMain.handle('system:getEnvSnapshot', async () => {
    return getEnvSnapshot();
  });

  ipcMain.handle('system:openLogDir', async () => {
    const logDir = path.join(app.getPath('userData'), 'logs');
    await shell.openPath(logDir);
  });

  ipcMain.handle('cli:openTerminal', async () => {
    // 占位：主进程弹出 PowerShell/Terminal
    // 实际可用 child_process.spawn('wt') 等
  });
}
