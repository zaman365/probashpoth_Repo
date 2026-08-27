import { expect, test } from '@playwright/test';

/**
 * §14.1 — the website itself: landing page, navigation, and the pages a visitor reads
 * before they trust anything. These specs check the promises the page makes, and the
 * ones it must never make.
 */

test('the landing page leads with the product promise and both primary CTAs', async ({ page }) => {
  await page.goto('/bn');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('আপনার যাত্রা');
  await expect(page.locator('.hero-choice-card-work')).toContainText('বিদেশে চাকরি');
  await expect(page.locator('.hero-choice-card-study')).toContainText('বিদেশে উচ্চশিক্ষা');
  await expect(page.getByRole('link', { name: /আমার যাত্রা শুরু করুন/ })).toBeVisible();
});

test('the seven worker actions sit above everything a visitor merely reads (§15)', async ({
  page,
}) => {
  await page.goto('/bn');
  const tiles = page.locator('.action-tile');
  await expect(tiles).toHaveCount(7);

  // The action grid must come before the marketing sections in document order.
  const actionsTop = (await tiles.first().boundingBox())?.y ?? Infinity;
  const faqTop = (await page.getByRole('heading', { name: 'সাধারণ প্রশ্ন' }).boundingBox())?.y ?? 0;
  expect(actionsTop).toBeLessThan(faqTop);
});

test('every landing section renders with a heading', async ({ page }) => {
  await page.goto('/en');
  for (const heading of [
    'What would you like to do?',
    'What is on the platform today',
    'How it works',
    'Rules we will not break',
    'Understand first, then decide',
    'For organisations',
    'Common questions',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('the landing page never promises an outcome', async ({ page }) => {
  await page.goto('/en');
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('guaranteed visa');
  expect(body).not.toContain('100% visa');
  // It says the opposite, explicitly.
  expect(body).toContain('nobody can');
});

test('desktop shows the full navigation; small screens get a no-JS menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn');
  await expect(page.locator('.site-nav-desktop')).toBeVisible();
  await expect(page.locator('.site-nav-mobile')).toBeHidden();
  // Short labels in the bar; the descriptive ones live in the drawer and footer.
  await expect(page.locator('.site-nav-desktop').getByRole('link', { name: 'দেশ' })).toBeVisible();
  await expect(page.locator('.site-header-row')).toHaveCount(1);

  // The bar must never wrap into a second row — that is what turned it into a lozenge.
  const barHeight = (await page.locator('.site-header-row').boundingBox())?.height ?? 0;
  expect(barHeight).toBeLessThan(88);

  await page.setViewportSize({ width: 380, height: 800 });
  await expect(page.locator('.site-nav-desktop')).toBeHidden();
  const menu = page.locator('.site-nav-mobile');
  await expect(menu).toBeVisible();

  // The menu is a <details> disclosure, so it opens without JavaScript.
  await menu.getByText('মেনু').click();
  await expect(menu.getByRole('link', { name: 'দেশ দেখুন' })).toBeVisible();
});

test('the footer exposes the complete site map in structured groups', async ({ page }) => {
  await page.goto('/bn');
  const footer = page.locator('.site-footer');
  await expect(footer.locator('nav')).toHaveCount(6);
  await expect(footer.locator('nav a')).toHaveCount(44);
  await expect(footer.getByRole('link', { name: 'দেশ দেখুন' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'আমার আবেদন' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'সুরক্ষিত নথি' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'অভিবাসন লেজার' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'সতর্কতা ও ডেডলাইন' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'আইনগত অবস্থান' })).toBeVisible();
  await expect(footer.getByText('ডেমো তথ্য — এটি আসল চাকরি নয়')).toBeVisible();
});

test('the floating support launcher is an icon-only chat control', async ({ page }) => {
  await page.goto('/bn');

  const launcher = page.locator('.floating-chat-button');
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute('aria-label', 'সহায়তা চ্যাট খুলুন');
  await expect(launcher).toHaveAttribute('title', 'সহায়তা চ্যাট খুলুন');
  await expect(launcher.locator('.pui-icon')).toHaveCount(1);
  await expect(launcher).toHaveText('');

  const box = await launcher.boundingBox();
  expect(box?.width).toBe(56);
  expect(box?.height).toBe(56);
});

const PAGES = [
  '/about',
  '/how-it-works',
  '/faq',
  '/legal',
  '/study',
  '/for-employers',
  '/for-agencies',
  '/for-government',
];

for (const path of PAGES) {
  test(`${path} renders in both languages with alternates declared`, async ({ page }) => {
    for (const locale of ['bn', 'en']) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale}"]`)).toHaveAttribute(
        'href',
        new RegExp(`/${locale}${path}$`),
      );
    }
  });
}

test('the institutional pages state plainly that no portal exists yet', async ({ page }) => {
  for (const path of ['/for-employers', '/for-agencies', '/for-government']) {
    await page.goto(`/en${path}`);
    await expect(page.getByText('This portal is not open yet.')).toBeVisible();
    await expect(page.getByText('no partnership is claimed', { exact: false })).toBeVisible();
  }
});

test('the legal page publishes what the platform is not', async ({ page }) => {
  await page.goto('/en/legal');
  await expect(page.getByText('Not a government service')).toBeVisible();
  await expect(page.getByText('we do not hold your money', { exact: false })).toBeVisible();
});
