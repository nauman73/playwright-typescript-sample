import { expect, test } from '../fixtures';
import { PropertiesPage } from '../pages/PropertiesPage';

test('the list shows the property with its details', async ({ page, property }) => {
  const list = new PropertiesPage(page);
  await list.goto();
  await expect(list.item(property.address)).toContainText('2 bedrooms');
  await expect(list.item(property.address)).toContainText('$1,800 per month');
});
