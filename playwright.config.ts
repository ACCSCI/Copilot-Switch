import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// 加载 .env 文件（Playwright 进程不会自动读）
config({ path: '.env' });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'electron-windows',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
