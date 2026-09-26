import { expect, test } from '../fixtures';
import { asBody, insertShowing } from '../fixtures/data';

// All times are America/New_York. "Now" is Monday 2031-02-03 10:00 EST (15:00Z).
const WED_11_00 = '2031-02-05T16:00:00.000Z';
const WED_11_30 = '2031-02-05T16:30:00.000Z';
const MON_09_00 = '2031-02-03T14:00:00.000Z'; // one hour before now

test('rescheduling to a free slot moves the showing', async ({ api, db, property }) => {
  const showing = await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_00) });
  const res = await api.patch(`/api/showings/${showing.id}`, { data: { startsAt: WED_11_30 } });
  expect(res.status()).toBe(200);
  expect((await res.json()).startsAt).toBe(WED_11_30);
});

test('rescheduling to a taken slot returns 409 SLOT_TAKEN', async ({ api, db, property }) => {
  const showing = await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_00) });
  await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_30) });
  const res = await api.patch(`/api/showings/${showing.id}`, { data: { startsAt: WED_11_30 } });
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('SLOT_TAKEN');
});

test('rescheduling a showing that has started returns 422 SHOWING_STARTED', async ({ api, db, property }) => {
  const showing = await insertShowing(db, { propertyId: property.id, startsAt: new Date(MON_09_00) });
  const res = await api.patch(`/api/showings/${showing.id}`, { data: { startsAt: WED_11_30 } });
  expect(res.status()).toBe(422);
  expect((await res.json()).code).toBe('SHOWING_STARTED');
});

test('a cancelled showing frees its slot for a new booking', async ({ api, db, property, prospect }) => {
  const showing = await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_00) });
  expect((await api.delete(`/api/showings/${showing.id}`)).status()).toBe(200);
  const res = await api.post('/api/showings', { data: { propertyId: property.id, startsAt: WED_11_00, ...asBody(prospect) } });
  expect(res.status()).toBe(201);
});

test('cancelling or rescheduling a cancelled showing returns 409 ALREADY_CANCELLED', async ({ api, db, property }) => {
  const showing = await insertShowing(db, { propertyId: property.id, startsAt: new Date(WED_11_00) });
  await api.delete(`/api/showings/${showing.id}`);
  const again = await api.delete(`/api/showings/${showing.id}`);
  expect(again.status()).toBe(409);
  expect((await again.json()).code).toBe('ALREADY_CANCELLED');
  const move = await api.patch(`/api/showings/${showing.id}`, { data: { startsAt: WED_11_30 } });
  expect(move.status()).toBe(409);
});

test('an unknown or non-UUID showing id returns 404', async ({ api }) => {
  for (const id of ['00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
    expect((await api.delete(`/api/showings/${id}`)).status()).toBe(404);
  }
});
