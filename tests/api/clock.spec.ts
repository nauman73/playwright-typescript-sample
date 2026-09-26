import { expect, test } from '../fixtures';

test('a malformed x-test-now header returns 400 INVALID_TEST_CLOCK', async ({ api }) => {
  const res = await api.get('/api/properties', { headers: { 'x-test-now': 'not-a-date' } });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_TEST_CLOCK');
});

test('an empty x-test-now header returns 400 INVALID_TEST_CLOCK', async ({ api }) => {
  const res = await api.get('/api/properties', { headers: { 'x-test-now': '' } });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_TEST_CLOCK');
});
