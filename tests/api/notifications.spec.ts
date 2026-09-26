import { expect, test } from '../fixtures';
import { asBody } from '../fixtures/data';

const WED_11_00 = '2031-02-05T16:00:00.000Z';
const WED_11_30 = '2031-02-05T16:30:00.000Z';

test('booking, rescheduling and cancelling each send one email and one SMS', async ({ api, property, prospect, mailbox, smsOutbox }) => {
  const booked = await (await api.post('/api/showings', { data: { propertyId: property.id, startsAt: WED_11_00, ...asBody(prospect) } })).json();
  const confirm = await mailbox.waitFor(prospect.email, `Showing confirmed: ${property.address}`);
  expect(confirm.Text).toContain('Wednesday, February 5, 2031 at 11:00 AM');

  await api.patch(`/api/showings/${booked.id}`, { data: { startsAt: WED_11_30 } });
  await mailbox.waitFor(prospect.email, `Showing rescheduled: ${property.address}`);

  await api.delete(`/api/showings/${booked.id}`);
  await mailbox.waitFor(prospect.email, `Showing cancelled: ${property.address}`);

  const sms = await smsOutbox.forProperty(property.id);
  expect(sms.map((m) => m.toNumber)).toEqual([prospect.phone, prospect.phone, prospect.phone]);
  expect(sms[0]!.body).toBe(`Viewings: your showing at ${property.address} is confirmed for Wednesday, February 5, 2031 at 11:00 AM.`);
  expect(sms[1]!.body).toContain('has moved to Wednesday, February 5, 2031 at 11:30 AM');
  expect(sms[2]!.body).toContain('is cancelled');
});
