import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  get addButton(): Locator {
    return this.page.getByRole('button', { name: /添加配置/ });
  }

  get providerList(): Locator {
    return this.page.getByTestId('provider-list');
  }

  get emptyState(): Locator {
    return this.page.getByTestId('empty-state');
  }

  providerCard(name: string): Locator {
    return this.providerList.getByTestId('provider-card').filter({ hasText: name });
  }

  async goto() {
    // 在 Electron 中，页面已自动加载到首页；只需等待标题
    if (!this.page.url().startsWith('http://localhost')) {
      await this.page.goto('/');
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickAdd() {
    await this.addButton.click();
  }

  async activateProvider(name: string) {
    const card = this.providerCard(name);
    await card.getByRole('button', { name: /启用/ }).click();
  }

  async expectActive(name: string) {
    const card = this.providerCard(name);
    await expect(card).toHaveAttribute('data-active', 'true');
  }

  async expectNotActive(name: string) {
    const card = this.providerCard(name);
    await expect(card).toHaveAttribute('data-active', 'false');
  }

  async clickHealth(name: string) {
    const card = this.providerCard(name);
    await card.getByTestId('action-health').click();
  }

  async clickEdit(name: string) {
    const card = this.providerCard(name);
    await card.getByTestId('action-edit').click();
  }

  async clickDelete(name: string) {
    const card = this.providerCard(name);
    await card.getByTestId('action-delete').click();
  }

  async clickCopy(name: string) {
    const card = this.providerCard(name);
    await card.getByTestId('action-copy').click();
  }

  async expectProviderCount(n: number) {
    await expect(this.providerList.getByTestId('provider-card')).toHaveCount(n);
  }
}
