import { ipcMain, shell } from 'electron';
import { getEnvSnapshot } from '../services/envSwitcher';
import { logger } from '../logger';

export function registerSystemIpc() {
  ipcMain.handle('system:getEnvSnapshot', async () => {
    return getEnvSnapshot();
  });

  ipcMain.handle('system:openLogDir', async () => {
    const logDir = logger.getLogDir();
    await shell.openPath(logDir);
  });

  ipcMain.handle('system:getLogs', async () => {
    return logger.getLogs().slice(-200); // 最近 200 行
  });

  ipcMain.handle('system:getLogPath', async () => {
    return logger.getLogPath();
  });
}
