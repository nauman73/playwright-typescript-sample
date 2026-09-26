import { expect, type Page } from '@playwright/test';

export class PropertyPage {
  constructor(private page: Page) {}
  goto(id: string) {
    return this.page.goto(`/properties/${id}`);
  }
  /** The slot picker's section for one day, found by its heading, such as "Tuesday, February 4". */
  day(label: string) {
    return this.page.getByRole('region', { name: label });
  }
  /** A slot that can be booked. It is a link to the booking form. */
  availableSlot(day: string, time: string) {
    return this.day(day).getByRole('link', { name: time, exact: true });
  }
  /** A slot that cannot be booked. It is a disabled button. */
  unavailableSlot(day: string, time: string) {
    return this.day(day).getByRole('button', { name: time, exact: true });
  }
  async chooseSlot(day: string, time: string) {
    await this.availableSlot(day, time).click();
    await expect(this.page.getByRole('heading', { name: 'Book a showing' })).toBeVisible();
  }
}
