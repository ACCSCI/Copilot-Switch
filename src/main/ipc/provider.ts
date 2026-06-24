import { ipcMain } from 'electron';
import { providerRepo } from '../db/repository';
import { providerInputSchema, activateProviderInputSchema } from '@shared/schemas';
import { activateProvider } from '../services/envSwitcher';
import { encryptSecret, decryptSecret } from '../services/crypto';
import { logger } from '../logger';
import type { ProviderSecrets } from '@shared/types';

export function registerProviderIpc() {
  ipcMain.handle('providers:list', async () => {
    return providerRepo.list();
  });

  ipcMain.handle('providers:create', async (_e, raw: unknown) => {
    const input = providerInputSchema.parse(raw);
    const dto = await providerRepo.create(input);
    if (input.apiKey || input.bearerToken) {
      await providerRepo.setEncryptedSecrets(dto.id, {
        apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : null,
        bearerTokenEncrypted: input.bearerToken ? encryptSecret(input.bearerToken) : null,
      });
    }
    logger.info('provider created', { id: dto.id, name: dto.name, type: dto.type });
    return providerRepo.list().then((list) => list.find((p) => p.id === dto.id)!);
  });

  ipcMain.handle('providers:update', async (_e, id: string, raw: unknown) => {
    const input = providerInputSchema.parse(raw);
    const dto = await providerRepo.update(id, input);
    if (input.apiKey || input.bearerToken) {
      await providerRepo.setEncryptedSecrets(id, {
        apiKeyEncrypted: input.apiKey ? encryptSecret(input.apiKey) : null,
        bearerTokenEncrypted: input.bearerToken ? encryptSecret(input.bearerToken) : null,
      });
    }
    logger.info('provider updated', { id });
    return dto;
  });

  ipcMain.handle('providers:delete', async (_e, id: string) => {
    await providerRepo.delete(id);
    logger.info('provider deleted', { id });
  });

  ipcMain.handle('providers:reorder', async (_e, ids: string[]) => {
    if (!Array.isArray(ids)) throw new Error('ids must be array');
    await providerRepo.reorder(ids);
  });

  ipcMain.handle('providers:activate', async (_e, raw: unknown) => {
    const { providerId } = activateProviderInputSchema.parse(raw);
    return activateProvider(providerId);
  });

  ipcMain.handle('providers:getSecrets', async (_e, id: string): Promise<ProviderSecrets> => {
    const row = await providerRepo.getById(id);
    if (!row) {
      logger.warn('getSecrets: provider not found', { id });
      throw new Error(`Provider not found: ${id}`);
    }
    try {
      return {
        apiKey: row.api_key_encrypted ? decryptSecret(row.api_key_encrypted) : '',
        bearerToken: row.bearer_token_encrypted ? decryptSecret(row.bearer_token_encrypted) : '',
      };
    } catch (e) {
      logger.error('getSecrets: decrypt failed', {
        id,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  });
}