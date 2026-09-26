import { clerk } from '@clerk/testing/playwright';
import { expect, test as setup } from '@playwright/test';
import { STAFF_STATE } from '../support/constants';

setup.describe.configure({ mode: 'serial' });

setup('target is not production and accepts the test clock', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const health = await res.json();
  expect(health.appEnv, 'Refusing to run the suite against production').not.toBe('production');
  expect(health.testClock, 'Start the app with ALLOW_TEST_CLOCK=true').toBe(true);
});

setup('sign in the staff user and save the browser state', async ({ page }) => {
  await page.goto('/sign-in');
  const email = process.env.E2E_CLERK_USER_EMAIL;
  expect(email, 'Set E2E_CLERK_USER_EMAIL in .env').toBeTruthy();
  await clerk.signIn({ page, emailAddress: email! });
  await page.goto('/properties');
  await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
  await page.context().storageState({ path: STAFF_STATE });
});
