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

/** 读取主进程当前环境变量 */
export async function getEnv(app: ElectronApplication) {
  return app.evaluate(({ process }) => ({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    AZURE_OPENAI_KEY: process.env.AZURE_OPENAI_KEY,
    AZURE_OPENAI_BASE_URL: process.env.AZURE_OPENAI_BASE_URL,
    COPILOT_MODEL: process.env.COPILOT_MODEL,
    COPILOT_WIRE_API: process.env.COPILOT_WIRE_API,
  }));
}

/** 等待主进程中的某个 IPC 调用完成 */
export async function waitForIpc(page: Page, event: string, timeout = 10_000) {
  return page.waitForFunction(
    (ev) => {
      // 占位：实际等待通过 await page.evaluate
      return true;
    },
    event,
    { timeout },
  );
}
