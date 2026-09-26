import { expect, test } from '../fixtures';
import { BookingPage } from '../pages/BookingPage';
import { PropertyPage } from '../pages/PropertyPage';
import { ShowingPage } from '../pages/ShowingPage';

test('staff book a slot and see the confirmation', async ({ page, property, prospect }) => {
  const detail = new PropertyPage(page);
  await detail.goto(property.id);
  await detail.chooseSlot('Tuesday, February 4', '10:00 AM');
  await new BookingPage(page).book(prospect);
  const showing = new ShowingPage(page);
  await expect(showing.status).toHaveText('Showing booked');
  await expect(showing.details).toContainText(property.address);
  await expect(showing.details).toContainText('Tuesday, February 4, 2031 at 10:00 AM');
  await expect(showing.details).toContainText(prospect.name);
});
