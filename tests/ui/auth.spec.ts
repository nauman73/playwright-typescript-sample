import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '../fixtures';

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a visitor to /properties is redirected to sign-in', async ({ page }) => {
    await page.goto('/properties');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('staff sign in through the form and reach the properties page', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/properties');
    await page.getByLabel('Email address').fill(process.env.E2E_CLERK_USER_EMAIL!);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_CLERK_USER_PASSWORD!);
    // Clerk asks a browser with no saved state to confirm the new device with an emailed code.
    // It shows the code form before its request to send the code completes, and it rejects a
    // code entered before then, so the test waits for that request.
    const codeSent = page.waitForResponse(/\/prepare_(first|second)_factor/);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    expect((await codeSent).ok()).toBeTruthy();
    // Clerk test users (+clerk_test addresses) accept the fixed code 424242.
    await page.getByRole('textbox', { name: 'Enter verification code' }).fill('424242');
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
  });
});

test('saved staff state opens the properties page without signing in', async ({ page }) => {
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
});
