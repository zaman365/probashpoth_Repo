import { expect, test } from '@playwright/test';

/**
 * §14.1 — the public web surface: indexable, usable with no account, and honest
 * about what is and is not known. These specs assert that a person who has never
 * signed up can still learn what they need before anyone asks them for money.
 */

test('the public knowledge surface is reachable from every page', async ({ page }) => {
  await page.goto('/bn');
  await page.setViewportSize({ width: 1280, height: 900 });
  const nav = page.locator('.site-nav-desktop');
  await expect(nav.getByRole('link', { name: 'দেশ' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'পেশা' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'নিরাপত্তা' })).toBeVisible();
});

test('the country index lists countries with their operational status', async ({ page }) => {
  await page.goto('/bn/countries');
  await expect(page.getByRole('heading', { name: 'দেশভিত্তিক তথ্য' })).toBeVisible();
  const qatar = page.getByRole('link', { name: 'কাতার' });
  await expect(qatar).toBeVisible();
  await qatar.click();
  await expect(page).toHaveURL(/\/bn\/countries\/qa$/);
});

test('a country guide shows routes, jobs and the official sources behind them', async ({
  page,
}) => {
  await page.goto('/bn/countries/qa');
  const main = page.locator('#main');
  await expect(main.getByRole('heading', { name: 'কাতার', level: 1 })).toBeVisible();
  await expect(
    main.getByRole('heading', { name: 'এই দেশে যাওয়ার পথ', exact: true }),
  ).toBeVisible();
  await expect(main.getByRole('heading', { name: 'এই দেশে যাচাইকৃত চাকরি' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'এই তথ্যের সরকারি উৎস' })).toBeVisible();
});

test('a country with no published route says so instead of implying one exists', async ({
  page,
}) => {
  // Bhutan is seeded like every other ISO country but has no published route.
  await page.goto('/bn/countries/bt');
  await expect(
    page.getByText('এই দেশের জন্য এখনো কোনো যাচাইকৃত পথ প্রকাশ করা হয়নি।'),
  ).toBeVisible();
});

test('an occupation guide is built from verified jobs, with real salaries', async ({ page }) => {
  await page.goto('/bn/occupations/electrician');
  const main = page.locator('#main');
  await expect(main.getByRole('heading', { name: 'ইলেকট্রিশিয়ান', level: 1 })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'যেসব দেশে এই কাজের সুযোগ আছে' })).toBeVisible();
  await expect(main.getByText('QAR')).toBeVisible();
  // Even a guide page repeats that nobody can promise a visa (§74).
  await expect(
    main.getByText('ভিসার সিদ্ধান্ত সংশ্লিষ্ট কর্তৃপক্ষ নেয়। কেউ ভিসার নিশ্চয়তা দিতে পারে না।'),
  ).toBeVisible();
});

test('the scam-education page pairs every warning sign with an action', async ({ page }) => {
  await page.goto('/bn/safety');
  const signs = page.locator('#main ol > li');
  await expect(signs).toHaveCount(8);

  // "Be careful" is not advice: every card must carry a concrete action.
  for (let index = 0; index < 8; index += 1) {
    const card = signs.nth(index);
    await expect(card.getByText('তখন কী করবেন').first()).toBeVisible();
    await expect(card.locator('.card-muted p')).not.toBeEmpty();
  }
});

test('guide pages declare Bangla and English alternates for search engines', async ({ page }) => {
  await page.goto('/bn/countries/qa');
  const bn = page.locator('link[rel="alternate"][hreflang="bn"]');
  const en = page.locator('link[rel="alternate"][hreflang="en"]');
  await expect(bn).toHaveAttribute('href', /\/bn\/countries\/qa$/);
  await expect(en).toHaveAttribute('href', /\/en\/countries\/qa$/);
});

test('robots.txt keeps case and payment pages out of search results (§51)', async ({ request }) => {
  const response = await request.get('/robots.txt');
  const body = await response.text();
  expect(body).toContain('Disallow: /bn/cases');
  expect(body).toContain('Disallow: /en/cases');
  expect(body).toContain('Sitemap:');
});

test('the sitemap lists public guides and never a case', async ({ request }) => {
  const body = await (await request.get('/sitemap.xml')).text();
  expect(body).toContain('/bn/countries/qa');
  expect(body).toContain('/bn/occupations/electrician');
  expect(body).toContain('/bn/safety');
  expect(body).not.toContain('/cases/');
});
