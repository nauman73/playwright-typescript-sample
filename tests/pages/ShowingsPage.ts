import type { Page } from '@playwright/test';

export class ShowingsPage {
  constructor(private page: Page) {}
  goto() {
    return this.page.goto('/showings');
  }
  get status() {
    return this.page.getByRole('main').getByRole('status');
  }
  item(address: string) {
    return this.page.getByRole('main').getByRole('listitem').filter({ hasText: address });
  }
}
