import { test as base, _electron as electron, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

type Fixtures = {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..', '..');

export const test = base.extend<Fixtures>({
  userDataDir: async ({}, use) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'copilot-switch-e2e-'));
    await use(dir);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  },

  app: async ({ userDataDir }, use) => {
    const app = await electron.launch({
      args: [path.join(ROOT, 'dist', 'main', 'index.js')],
      env: {
        ...process.env,
        ELECTRON_USER_DATA: userDataDir,
        NODE_ENV: 'test',
      },
      timeout: 30_000,
    });
    await use(app);
    await app.close();
  },

  page: async ({ app }, use) => {
    const page = await app.firstWindow();
    // 捕获 console 错误
    page.on('console', (msg) => console.log('[renderer]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
});

export { expect };
