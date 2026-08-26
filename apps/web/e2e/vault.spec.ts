import { expect, test } from '@playwright/test';

/**
 * §14.1 / §38 — the country information vault.
 *
 * The point of these specs is provenance: a figure on this page must always arrive
 * with the source it came from and the year it applied to, and anything unconfirmed
 * must be shown as an open question rather than quietly omitted.
 */

test('the vault covers both paths and remembers which one is open', async ({ page }) => {
  await page.goto('/en/countries/de?path=study');
  const tabs = page.locator('.intent-switch-option');
  await expect(tabs).toHaveCount(2);
  await expect(page.locator('.intent-switch-option.is-selected')).toContainText('Study abroad');

  await page.goto('/en/countries/de?path=work');
  await expect(page.locator('.intent-switch-option.is-selected')).toContainText('Work abroad');
});

test('every researched figure shows its source and its year', async ({ page }) => {
  await page.goto('/en/countries/de?path=study');

  // The figures themselves, from the German mission's own published requirements.
  await expect(page.getByText('€11,904')).toBeVisible();
  await expect(page.getByText('€992 / month')).toBeVisible();

  const factCards = page.locator('.pui-section', { hasText: 'Key figures' }).locator('.pui-card');
  const count = await factCards.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const card = factCards.nth(index);
    await expect(card.getByText('Applies to')).toBeVisible();
    await expect(card.locator('.vault-source')).toHaveAttribute('href', /^https:\/\//);
  }
});

test('the work vault carries the salary thresholds with their year', async ({ page }) => {
  await page.goto('/en/countries/de?path=work');
  await expect(page.getByText('€50,700 / year')).toBeVisible();
  await expect(page.getByText('€45,934.20 / year')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visa and permit types' })).toBeVisible();
  await expect(page.getByText('EU Blue Card').first()).toBeVisible();
});

test('an unconfirmed figure is shown as an open question, not omitted', async ({ page }) => {
  // The UK maintenance figure is one we could not confirm from GOV.UK directly.
  await page.goto('/en/countries/gb?path=study');
  await expect(page.getByText('Not confirmed yet').first()).toBeVisible();
  await expect(
    page.getByText('Check the current figure on GOV.UK', { exact: false }),
  ).toBeVisible();
});

test('the vault says plainly that it has not been human-reviewed', async ({ page }) => {
  await page.goto('/en/countries/de');
  await expect(
    page.getByText('has not yet been reviewed by a person', { exact: false }),
  ).toBeVisible();
});

test('a path with no verified route says so rather than showing an empty shell', async ({
  page,
}) => {
  await page.goto('/en/countries/qa?path=study');
  await expect(
    page.getByText('has not been verified for this country yet', { exact: false }),
  ).toBeVisible();
  // And the sections that would have been empty are simply not rendered.
  await expect(page.getByRole('heading', { name: 'Visa and permit types' })).toHaveCount(0);
});

test('the work vault for a Gulf corridor leads with the contract and the passport rule', async ({
  page,
}) => {
  await page.goto('/en/countries/qa?path=work');
  await expect(page.getByRole('heading', { name: 'Risks on this path' })).toBeVisible();
  await expect(page.getByText('Nobody may hold your passport', { exact: false })).toBeVisible();
  await expect(
    page.getByText('cannot work on a visit or so-called free visa', { exact: false }),
  ).toBeVisible();
});

test('vaults exist for the corridors that matter most, in both languages', async ({ page }) => {
  for (const code of ['de', 'gb', 'ca', 'jp', 'kr', 'sg', 'sa', 'qa', 'ae', 'au', 'my']) {
    const response = await page.goto(`/bn/countries/${code}`);
    expect(response?.status(), code).toBe(200);
    await expect(page.getByText('সম্পূর্ণ তথ্যভাণ্ডার', { exact: false })).toBeVisible();
  }
});
