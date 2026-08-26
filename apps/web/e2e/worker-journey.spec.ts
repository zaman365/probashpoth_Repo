import { expect, test } from '@playwright/test';

/**
 * §63 — the vertical slice, from the outside. These specs assert the *promises* the
 * blueprint makes to a worker, not implementation details.
 */

test('the home page is Bangla-first and offers the seven primary actions', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/bn$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  const actions = page.getByRole('navigation', { name: 'আপনি কী করতে চান?' });
  await expect(actions.getByRole('link', { name: 'বিদেশে কাজ খুঁজুন' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'চাকরি / ভিসা যাচাই করুন' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'সাহায্য চাই' })).toBeVisible();
});

test('every primary action meets the 48px tap target rule (§15)', async ({ page }) => {
  await page.goto('/bn');
  const tiles = page.locator('.action-tile');
  const count = await tiles.count();
  expect(count).toBe(7);
  for (let i = 0; i < count; i += 1) {
    const box = await tiles.nth(i).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
  }
});

test('English is available on every page and keeps the same content', async ({ page }) => {
  await page.goto('/bn');
  await page.getByRole('link', { name: /English/ }).click();
  await expect(page).toHaveURL(/\/en$/);
  // The label appears in the site nav as well, so scope to the page body.
  await expect(page.locator('#main').getByRole('link', { name: 'Find work abroad' })).toBeVisible();
});

test('a verified job shows its lawful worker cost and what was verified', async ({ page }) => {
  await page.goto('/bn/jobs');
  await page
    .getByRole('link', { name: /ইলেকট্রিশিয়ান \(দোহা\)/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/bn\/jobs\/[^/]+$/);

  const main = page.locator('#main');
  await expect(main.getByRole('heading', { name: 'আপনার সর্বোচ্চ বৈধ খরচ' })).toBeVisible();
  await expect(main.getByText('এই প্রক্রিয়ার বাইরে কাউকে টাকা দেবেন না।')).toBeVisible();

  // §75 — the badge must always open into what was, and was not, verified.
  await main.getByText('ঠিক কী যাচাই করা হয়েছে?').click();
  await expect(main.getByText('যা যাচাই করা হয়নি')).toBeVisible();
});

test('the public verification page works without an account and shows a QR', async ({ page }) => {
  await page.goto('/bn/verify/job/BD-QA-2026-00482915');
  const main = page.locator('#main');
  await expect(main.getByText('যাচাইকৃত চাকরি').first()).toBeVisible();
  await expect(main.locator('svg').first()).toBeVisible();
  await expect(main.getByText('ডেমো তথ্য — এটি আসল চাকরি নয়')).toBeVisible();
});

test('an invented verification id is reported as not found, not ignored', async ({ page }) => {
  await page.goto('/bn/verify/job/BD-QA-2026-99999999');
  await expect(page.getByText('এই যাচাই নম্বর আমাদের রেকর্ডে নেই')).toBeVisible();
});

test('the scanner flags a fraudulent offer and explains what to do', async ({ page }) => {
  await page.goto('/bn/verify');
  await page.getByLabel('যাচাই নম্বর').fill('BD-QA-2026-00482915');
  await page
    .getByLabel('মেসেজ বসান')
    .fill('100% visa guarantee! Send 150000 taka to my personal bkash 01812345678, cash only.');
  await page.getByRole('button', { name: 'এখনই যাচাই করুন' }).click();
  await expect(page.getByText('উচ্চ ঝুঁকি — টাকা দেবেন না')).toBeVisible();
  await expect(page.getByText('এখন কী করবেন')).toBeVisible();
});

test('a route page shows source-backed requirements and never guarantees a visa', async ({
  page,
}) => {
  await page.goto('/bn/explore');
  await page
    .getByRole('link', { name: /কাতার — নিয়োগকর্তা স্পনসরড কাজের রুট/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/bn\/routes\//);

  const main = page.locator('#main');
  await expect(main.getByRole('heading', { name: 'যা যা লাগবে' })).toBeVisible();
  // Provenance appears both on the eligibility answer and on the route itself (§38).
  await expect(main.getByRole('heading', { name: 'এই তথ্যের সরকারি উৎস' }).first()).toBeVisible();
  await expect(
    main.getByText('ভিসার সিদ্ধান্ত সংশ্লিষ্ট কর্তৃপক্ষ নেয়। কেউ ভিসার নিশ্চয়তা দিতে পারে না।'),
  ).toBeVisible();
});

test('signing in requires an explicit consent action (§17)', async ({ page }) => {
  // A fresh number each run: OTP requests are throttled per number, and a reused
  // fixture number would fail the test for the wrong reason.
  const phone = `017${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

  await page.goto('/bn/onboarding');
  await page.getByLabel('মোবাইল নম্বর').fill(phone);
  await page.getByRole('button', { name: 'কোড পাঠান' }).click();
  await expect(page.getByText('কোডটি লিখুন')).toBeVisible();
  const consent = page.getByRole('checkbox');
  await expect(consent).not.toBeChecked();
});
