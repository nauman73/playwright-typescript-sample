import { expect, test } from '../fixtures';
import { asBody, insertShowing } from '../fixtures/data';

// All times are America/New_York. "Now" is Monday 2031-02-03 10:00 EST (15:00Z).
const TUE_10_00 = '2031-02-04T15:00:00.000Z'; // exactly 24 h after now
const TUE_09_30 = '2031-02-04T14:30:00.000Z'; // 23 h 30 min after now
const TUE_08_30 = '2031-02-04T13:30:00.000Z';
const TUE_17_00 = '2031-02-04T22:00:00.000Z';
const TUE_10_15 = '2031-02-04T15:15:00.000Z';
const SAT_10_00 = '2031-02-08T15:00:00.000Z';
const WED_11_00 = '2031-02-05T16:00:00.000Z';

test('a valid slot returns 201 and the showing is stored', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: WED_11_00, ...asBody(prospect) } });
  expect(res.status()).toBe(201);
  const showing = await res.json();
  expect(showing).toMatchObject({ propertyId: property.id, startsAt: WED_11_00, status: 'booked', prospectEmail: prospect.email });
  const get = await api.get(`/api/properties/${property.id}/slots?from=2031-02-05&days=1`);
  const [day] = await get.json();
  expect(day.slots.find((s: { startsAt: string }) => s.startsAt === WED_11_00)).toMatchObject({ available: false, reason: 'SLOT_TAKEN' });
});

test('a slot exactly 24 hours away returns 201', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: TUE_10_00, ...asBody(prospect) } });
  expect(res.status()).toBe(201);
});

test('a slot 23 hours 30 minutes away returns 422 INSUFFICIENT_NOTICE', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: TUE_09_30, ...asBody(prospect) } });
  expect(res.status()).toBe(422);
  expect((await res.json()).code).toBe('INSUFFICIENT_NOTICE');
});

for (const [label, startsAt] of [['08:30', TUE_08_30], ['17:00', TUE_17_00], ['Saturday', SAT_10_00]] as const) {
  test(`a slot at ${label} returns 422 OUTSIDE_BUSINESS_HOURS`, async ({ api, property, prospect }) => {
    const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt, ...asBody(prospect) } });
    expect(res.status()).toBe(422);
    expect((await res.json()).code).toBe('OUTSIDE_BUSINESS_HOURS');
  });
}

test('a slot at 10:15 returns 422 INVALID_SLOT', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: TUE_10_15, ...asBody(prospect) } });
  expect(res.status()).toBe(422);
  expect((await res.json()).code).toBe('INVALID_SLOT');
});

test('booking a taken slot returns 409 SLOT_TAKEN', async ({ api, db, property, prospect }) => {
  await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_00) });
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: WED_11_00, ...asBody(prospect) } });
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('SLOT_TAKEN');
});

test('two simultaneous requests for one slot produce one 201 and one 409', async ({ api, property, prospect }) => {
  const book = () => api.post('/api/showings', { data: { propertyId: property.id, startsAt: WED_11_00, ...asBody(prospect) } });
  const statuses = (await Promise.all([book(), book()])).map((r) => r.status()).sort();
  expect(statuses).toEqual([201, 409]);
});

test('a booking with invalid fields returns 400 VALIDATION', async ({ api, property }) => {
  const res = await api.post('/api/showings', {
    data: { propertyId: property.id, startsAt: 'next tuesday', prospectName: '', prospectEmail: 'nope', prospectPhone: '' },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('VALIDATION');
});

test('a booking body with missing fields returns 400 VALIDATION', async ({ api, property }) => {
  const res = await api.post('/api/showings', { data: { propertyId: property.id } });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('VALIDATION');
});

test('a booking body that is not JSON returns 400 VALIDATION', async ({ api }) => {
  // Playwright encodes a string as JSON when the content type is JSON, so the raw text goes in a Buffer.
  const res = await api.post('/api/showings', {
    data: Buffer.from('not json'),
    headers: { 'content-type': 'application/json' },
  });
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ code: 'VALIDATION', message: 'Body must be JSON' });
});

test('an unknown or non-UUID property id returns 404', async ({ api, prospect }) => {
  for (const id of ['00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
    const res = await api.post('/api/showings', { data: { propertyId: id, startsAt: WED_11_00, ...asBody(prospect) } });
    expect(res.status()).toBe(404);
  }
});

test('a slot on the first Monday of daylight saving time is accepted at 09:00 local', async ({ api, property, prospect }) => {
  const res = await api.post('/api/showings', {
    headers: { 'x-test-now': '2031-03-07T15:00:00.000Z' }, // Friday 7 March, 10:00 EST
    data: { propertyId: property.id, startsAt: '2031-03-10T13:00:00.000Z', ...asBody(prospect) }, // Monday 09:00 EDT
  });
  expect(res.status()).toBe(201);
});

test('a slots request with a malformed from date returns 400 VALIDATION', async ({ api, property }) => {
  const res = await api.get(`/api/properties/${property.id}/slots?from=2031-02-30&days=1`);
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('VALIDATION');
});
