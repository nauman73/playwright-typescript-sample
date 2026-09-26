import type { Page } from '@playwright/test';

/**
 * Freezes time for a page's requests to the app. Requests to the app's own origin, including
 * the `fetch` calls that client components make, carry `x-test-now`, so the server computes
 * availability and the booking rules for that time.
 *
 * The header goes only to the app's origin, because a custom header on requests to Clerk's
 * domain would cause CORS preflight requests that Clerk may reject.
 *
 * The browser clock is not frozen. When the browser clock is set to the test time, Clerk's
 * browser SDK writes session cookies that the server rejects, and signing in fails. The app
 * computes every time-dependent value on the server, so the header alone is enough.
 */
export async function freezeTime(page: Page, baseURL: string, at: Date) {
  const origin = new URL(baseURL).origin;
  await page.route(
    (url) => url.origin === origin,
    (route) => route.continue({ headers: { ...route.request().headers(), 'x-test-now': at.toISOString() } }),
  );
}
