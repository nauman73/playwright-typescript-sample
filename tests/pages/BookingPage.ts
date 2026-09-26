import type { Page } from '@playwright/test';
import type { Prospect } from '../fixtures/data';

export class BookingPage {
  constructor(private page: Page) {}
  async book(p: Prospect) {
    await this.page.getByLabel('Name').fill(p.name);
    await this.page.getByLabel('Email').fill(p.email);
    await this.page.getByLabel('Phone').fill(p.phone);
    await this.page.getByRole('button', { name: 'Book showing' }).click();
  }
}
