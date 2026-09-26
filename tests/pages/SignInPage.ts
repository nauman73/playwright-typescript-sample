import { expect, type Page } from '@playwright/test';

export class SignInPage {
  constructor(private page: Page) {}

  /** Signs in through Clerk's form, including the new-device email code step. */
  async signIn(email: string, password: string) {
    await this.page.getByLabel('Email address').fill(email);
    await this.page.getByRole('button', { name: 'Continue', exact: true }).click();
    await this.page.getByLabel('Password', { exact: true }).fill(password);
    // Clerk asks a browser with no saved state to confirm the new device with an emailed code.
    // It shows the code form before its request to send the code completes, and it rejects a
    // code entered before then, so the method waits for that request.
    const codeSent = this.page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/prepare_'),
      { timeout: 15_000 },
    );
    await this.page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    expect((await codeSent).ok()).toBeTruthy();
    // Clerk test users (+clerk_test addresses) accept the fixed code 424242.
    await this.page.getByRole('textbox', { name: 'Enter verification code' }).fill('424242');
  }
}
