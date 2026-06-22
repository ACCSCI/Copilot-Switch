import { ipcMain } from 'electron';
import { providerRepo } from '../db/repository';
import { pingProvider } from '../services/healthChecker';

export function registerTestProviderIpc() {
  ipcMain.handle('testProvider:ping', async (_e, providerId: string) => {
    const provider = await providerRepo.getById(providerId);
    if (!provider) {
      return { ok: false, latencyMs: 0, error: 'Provider not found' };
    }
    return pingProvider(provider, { shallowOnly: false });
  });
}
