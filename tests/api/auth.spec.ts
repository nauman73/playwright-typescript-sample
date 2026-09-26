import { expect, test } from '../fixtures';

test('an API request without a token returns 401', async ({ playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL });
  const res = await anonymous.get('/api/properties');
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ code: 'UNAUTHENTICATED' });
  await anonymous.dispose();
});

test('an API request with a Clerk session token is accepted', async ({ api }) => {
  const res = await api.get('/api/properties');
  expect(res.status()).toBe(200);
});
