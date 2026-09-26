import { expect, test } from '../fixtures';
import { insertShowing } from '../fixtures/data';
import { ShowingPage } from '../pages/ShowingPage';
import { ShowingsPage } from '../pages/ShowingsPage';

// Wednesday 5 February 2031, 11:00 in America/New_York.
const WED_11_00 = new Date('2031-02-05T16:00:00.000Z');

test('staff reschedule a showing', async ({ page, db, property, prospect, mailbox, smsOutbox }) => {
  const s = await insertShowing(db, { propertyId: property.id, startsAt: WED_11_00, prospect });
  await page.goto(`/showings/${s.id}`);
  const showing = new ShowingPage(page);
  await showing.reschedule('Thursday, February 6, 2:00 PM');
  await expect(showing.status).toHaveText('Showing rescheduled');
  await expect(showing.details).toContainText('Thursday, February 6, 2031 at 2:00 PM');
  await mailbox.waitFor(prospect.email, `Showing rescheduled: ${property.address}`);
  await expect
    .poll(async () => (await smsOutbox.forProperty(property.id)).map((m) => m.body))
    .toContainEqual(expect.stringContaining('has moved to Thursday, February 6, 2031 at 2:00 PM'));
});

test('staff cancel a showing and it leaves the upcoming list', async ({ page, db, property, prospect, mailbox, smsOutbox }) => {
  const s = await insertShowing(db, { propertyId: property.id, startsAt: WED_11_00, prospect });
  await page.goto(`/showings/${s.id}`);
  await new ShowingPage(page).cancel();
  const list = new ShowingsPage(page);
  await expect(list.status).toHaveText('Showing cancelled');
  await expect(list.item(property.address)).toHaveCount(0);
  await mailbox.waitFor(prospect.email, `Showing cancelled: ${property.address}`);
  await expect
    .poll(async () => (await smsOutbox.forProperty(property.id)).map((m) => m.body))
    .toContainEqual(expect.stringContaining('is cancelled'));
});
