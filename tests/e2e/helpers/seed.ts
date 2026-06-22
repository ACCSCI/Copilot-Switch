/**
 * Seed：通过 IPC 直接写入测试供应商，绕开 UI
 */
import type { ElectronApplication } from '@playwright/test';
import type { ProviderInput } from '@shared/schemas';

export async function seedProviders(app: ElectronApplication, list: ProviderInput[]) {
  return app.evaluate(async (electron, items) => {
    const { ipcMain } = electron;
    const results: unknown[] = [];
    for (const item of items) {
      const dto = await ipcMain.emit('providers:create', null, item);
      results.push(dto);
    }
    return results;
  }, list);
}
