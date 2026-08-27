import { expect, test } from '@playwright/test';

test('public pages expose a localized breadcrumb trail', async ({ page }) => {
  await page.goto('/bn/mobility-services');

  const breadcrumbs = page.getByRole('navigation', { name: 'পৃষ্ঠা পথ' });
  await expect(breadcrumbs).toBeVisible();
  await expect(breadcrumbs.getByRole('link', { name: 'হোম' })).toHaveAttribute('href', '/bn');
  await expect(breadcrumbs.getByText('সম্পূর্ণ যাত্রা সহায়তা')).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('dynamic pages use human labels and never expose internal record IDs', async ({ page }) => {
  await page.goto('/en/countries/qa');

  const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(breadcrumbs).toContainText('Home');
  await expect(breadcrumbs).toContainText('Country guides');
  await expect(breadcrumbs).toContainText('Qatar');
  await expect(breadcrumbs.getByText('Qatar')).toHaveAttribute('aria-current', 'page');
});

test('the home page and account portal do not render breadcrumbs', async ({ page }) => {
  await page.goto('/bn');
  await expect(page.locator('.site-breadcrumbs')).toHaveCount(0);

  await page.goto('/bn/account');
  await expect(page.locator('.site-breadcrumbs')).toHaveCount(0);
});

test('breadcrumbs stay inside the viewport on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/bn/scholarships/demo-scholarship');

  const breadcrumbs = page.locator('.site-breadcrumbs');
  await expect(breadcrumbs).toBeVisible();
  const box = await breadcrumbs.boundingBox();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(320);
});
