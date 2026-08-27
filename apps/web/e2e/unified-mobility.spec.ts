import { expect, test } from '@playwright/test';

test('QuickCheck is useful before an account and keeps uncertainty visible', async ({ page }) => {
  await page.goto('/bn/quick-check');
  await expect(page.getByRole('heading', { name: /দ্রুত যোগ্যতা যাচাই/ })).toBeVisible();
  await expect(page.getByText('অ্যাকাউন্ট লাগবে না')).toBeVisible();

  await page.getByLabel('বয়স').fill('29');
  await page.getByLabel(/পছন্দের দেশ/).fill('QA');
  await page.getByLabel(/পেশা/).fill('electrician');
  await page.getByLabel(/অভিজ্ঞতা/).fill('48');
  await page.getByRole('button', { name: 'প্রাথমিক পথ দেখুন' }).click();

  await expect(page.getByRole('heading', { name: 'আপনার প্রাথমিক পথ' })).toBeVisible();
  await expect(page.getByText(/RESEARCH_ONLY/).first()).toBeVisible();
  await expect(page.getByText(/NEEDS_HUMAN_REVIEW/).first()).toBeVisible();
});

test('Trust Center exposes method, evidence states and ranking policy', async ({ page }) => {
  await page.goto('/en/trust');
  await expect(page.getByRole('heading', { name: 'Probashjatra Trust Center' })).toBeVisible();
  await expect(page.getByText('Commission never changes organic matches.')).toBeVisible();
  await expect(page.getByText('No raw trust score is published.')).toBeVisible();
});

test('official actions stay visibly external to government authorities', async ({ page }) => {
  await page.goto('/en/official-actions');
  await expect(page.getByRole('heading', { name: 'Official actions and handoffs' })).toBeVisible();
  await expect(page.getByText('It is not a government portal.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open official site' }).first()).toHaveAttribute(
    'target',
    '_blank',
  );
});

test('P1 and P2 surfaces disclose their actual implementation status', async ({ page }) => {
  await page.goto('/en/community');
  await expect(page.locator('.badge').getByText('PILOT', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Safe journey communities' })).toBeVisible();

  await page.goto('/en/arrival');
  await expect(page.locator('.badge').getByText('FOUNDATION', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Arrival mode/ })).toBeVisible();
});
