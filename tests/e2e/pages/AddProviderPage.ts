import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface ProviderFormData {
  name: string;
  type: 'openai' | 'azure' | 'anthropic';
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  wireApi?: 'completions' | 'responses';
  azureApiVersion?: string;
  model: string;
  icon?: string;
}

export class AddProviderPage {
  constructor(private page: Page) {}

  get title(): Locator {
    return this.page.getByRole('heading', { name: /添加配置/ });
  }

  get nameInput(): Locator {
    return this.page.getByLabel(/^名称$/);
  }

  get typeSelect(): Locator {
    return this.page.getByTestId('type-select');
  }

  get baseUrlInput(): Locator {
    return this.page.getByLabel(/Base URL/);
  }

  get apiKeyInput(): Locator {
    return this.page.getByLabel(/API Key/);
  }

  get bearerTokenInput(): Locator {
    return this.page.getByLabel(/Bearer Token/);
  }

  get modelInput(): Locator {
    return this.page.getByLabel(/模型/);
  }

  get iconInput(): Locator {
    return this.page.getByLabel(/图标/);
  }

  get wireApiSelect(): Locator {
    return this.page.getByTestId('wire-api-select');
  }

  get azureApiVersionInput(): Locator {
    return this.page.getByLabel(/Azure API Version/);
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /保存/ });
  }

  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: /取消/ });
  }

  async goto() {
    if (!this.page.url().includes('/add')) {
      await this.page.goto('/add');
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillForm(data: ProviderFormData) {
    await this.nameInput.fill(data.name);
    await this.typeSelect.click();
    await this.page.getByRole('option', { name: new RegExp(data.type, 'i') }).click();
    await this.baseUrlInput.fill(data.baseUrl);
    if (data.apiKey) await this.apiKeyInput.fill(data.apiKey);
    if (data.bearerToken) await this.bearerTokenInput.fill(data.bearerToken);
    if (data.model) await this.modelInput.fill(data.model);
    if (data.icon) await this.iconInput.fill(data.icon);
    if (data.wireApi) {
      await this.wireApiSelect.click();
      await this.page.getByRole('option', { name: new RegExp(data.wireApi, 'i') }).click();
    }
    if (data.azureApiVersion) {
      await this.azureApiVersionInput.fill(data.azureApiVersion);
    }
  }

  async submit() {
    await this.submitButton.click();
    await this.page.waitForURL('/');
  }
}
