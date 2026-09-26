import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '../fixtures';
import { SignInPage } from '../pages/SignInPage';

// Tracing is off in this file because the form sign-in types the test user's password into the page.
// Playwright accepts the trace option only at the top level of a file, not inside a describe group.
test.use({ trace: 'off' });

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a visitor to /properties is redirected to sign-in', async ({ page }) => {
    await page.goto('/properties');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('staff sign in through the form and reach the properties page', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/properties');
    await new SignInPage(page).signIn(process.env.E2E_CLERK_USER_EMAIL!, process.env.E2E_CLERK_USER_PASSWORD!);
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
  });
});

test('saved staff state opens the properties page without signing in', async ({ page }) => {
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
});
