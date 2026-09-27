import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures';

// A random UUID matches no row, and 'not-a-uuid' is rejected before the database is queried.
const UNKNOWN = randomUUID();
const PATHS = [
  `/properties/${UNKNOWN}`,
  `/properties/${UNKNOWN}/book`,
  `/showings/${UNKNOWN}`,
  '/showings/not-a-uuid',
];

for (const path of PATHS) {
  test(`${path.replace(UNKNOWN, '<unknown id>')} shows the not-found page`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to properties' }).click();
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
  });
}
