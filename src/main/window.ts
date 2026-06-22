import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const isDev = !appIsPackaged();

function appIsPackaged(): boolean {
  try {
    // dynamic require to avoid bundling
    const { app } = require('electron');
    return app.isPackaged;
  } catch {
    return false;
  }
}

export function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    title: 'Copilot Switch',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // 外部链接用默认浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // dev 模式下也加载 dist/renderer/index.html（Vite HMR）
    // 但 preload 从 dist/preload 加载（已构建为 CJS）
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  return win;
}
