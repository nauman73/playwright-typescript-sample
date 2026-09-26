import type { Page } from '@playwright/test';

export class PropertiesPage {
  constructor(private page: Page) {}
  goto() {
    return this.page.goto('/properties');
  }
  item(address: string) {
    return this.page.getByRole('main').getByRole('listitem').filter({ hasText: address });
  }
}
