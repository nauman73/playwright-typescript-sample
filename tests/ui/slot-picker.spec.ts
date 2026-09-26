import { expect, test } from '../fixtures';
import { PropertyPage } from '../pages/PropertyPage';

test('slots under 24 hours away and weekend days are unavailable', async ({ page, property }) => {
  const detail = new PropertyPage(page);
  await detail.goto(property.id);
  await expect(detail.unavailableSlot('Monday, February 3', '4:30 PM')).toBeDisabled();
  await expect(detail.unavailableSlot('Tuesday, February 4', '9:30 AM')).toBeDisabled();
  await expect(detail.availableSlot('Tuesday, February 4', '10:00 AM')).toBeVisible();
  await expect(detail.day('Saturday, February 8')).toContainText('Closed');
});
