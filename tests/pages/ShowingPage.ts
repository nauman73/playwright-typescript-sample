import type { Page } from '@playwright/test';

export class ShowingPage {
  constructor(private page: Page) {}
  get status() {
    return this.page.getByRole('main').getByRole('status');
  }
  get details() {
    return this.page.getByTestId('showing-details');
  }
  async reschedule(optionLabel: string) {
    await this.page.getByRole('combobox', { name: 'New time' }).selectOption({ label: optionLabel });
    await this.page.getByRole('button', { name: 'Reschedule' }).click();
  }
  cancel() {
    return this.page.getByRole('button', { name: 'Cancel showing' }).click();
  }
}
