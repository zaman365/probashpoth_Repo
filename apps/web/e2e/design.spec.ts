import { expect, test } from '@playwright/test';

/**
 * The visual language, asserted where it carries meaning rather than decoration:
 * the hero must be readable, its controls must be reachable, and the whole thing must
 * survive a phone with no JavaScript and a user who has asked for less motion.
 */

test('the hero carries the compact work/study switch at its foot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn?intent=study');

  const canvas = page.locator('.pui-canvas').first();
  const heroSwitch = canvas.locator('.intent-switch');
  await expect(heroSwitch).toHaveCount(1);
  await expect(heroSwitch.locator('.is-selected')).toContainText('বিদেশে পড়াশোনা');
});

test('the hero keeps both destinations visible', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('.hero-choice-card-work')).toContainText('Work abroad');
  await expect(page.locator('.hero-choice-card-study')).toContainText('Study abroad');
  await expect(page.locator('.hero-choice-card-work')).toContainText('Demo jobs');
  await expect(page.locator('.hero-choice-card-study')).toContainText('Courses');
});

test('the hero renders on the painted canvas with its controls', async ({ page }) => {
  await page.goto('/bn');
  const canvas = page.locator('.pui-canvas').first();
  await expect(canvas).toBeVisible();
  await expect(canvas.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(canvas.locator('.pui-chip-link')).toHaveCount(1);
  await expect(canvas.locator('.pui-feature-pill')).toHaveCount(3);
  await expect(canvas.locator('.hero-choice-card')).toHaveCount(2);
  await expect(canvas.locator('.hero-warning')).toHaveCount(0);
});

test('controls follow the device sizing rule', async ({ page }) => {
  await page.goto('/bn');

  // A finger gets the §15 minimum; a mouse gets the tighter visual scale.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const floor = coarse ? 48 : 44;

  for (const selector of ['.pui-chip-link', '.hero-choice-card', '.intent-switch-option']) {
    const box = await page.locator(selector).first().boundingBox();
    expect(
      box?.height ?? 0,
      `${selector} on a ${coarse ? 'coarse' : 'fine'} pointer`,
    ).toBeGreaterThanOrEqual(floor);
  }
});

test('nothing in the chrome comes close to the height of the chrome', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn');

  const bar = (await page.locator('.site-header-row').boundingBox())?.height ?? 0;
  expect(bar).toBeGreaterThan(0);

  for (const selector of ['.site-nav-desktop a', '.site-header-actions a']) {
    const box = await page.locator(selector).first().boundingBox();
    // A control as tall as the bar it sits in is what made the header look broken.
    expect(bar - (box?.height ?? 0)).toBeGreaterThanOrEqual(8);
  }
});

test('the worker action tiles keep their weight on every device (§15)', async ({ page }) => {
  await page.goto('/bn');
  const tiles = page.locator('.action-tile');
  const count = await tiles.count();
  for (let index = 0; index < count; index += 1) {
    const box = await tiles.nth(index).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the hero opens the work journey without scripting (§15)', async ({ page }) => {
    await page.goto('/bn');
    await page.locator('.hero-choice-card-work').click();
    await expect(page).toHaveURL(/\/bn\/work$/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('an id that is not in our records is still answered server-side', async ({ page }) => {
    await page.goto('/bn/verify?publicId=NOT-A-REAL-ID');
    await expect(page.getByText('এই যাচাই নম্বর পাওয়া যায়নি', { exact: true })).toBeVisible();
    await expect(page.getByText('উচ্চ ঝুঁকি — টাকা দেবেন না')).toBeVisible();
  });

  test('the small-screen menu opens without scripting', async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await page.goto('/bn');
    const menu = page.locator('.site-nav-mobile');
    await menu.getByText('মেনু').click();
    await expect(menu.getByRole('link', { name: 'দেশ দেখুন' })).toBeVisible();
  });
});

test.describe('with reduced motion', () => {
  test('entrance animation is dropped, and content is still there', async ({ page }) => {
    // Emulated in-test so the assertion cannot pass because of a project default.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/bn');
    const reveal = page.locator('.pui-reveal').first();
    await expect(reveal).toBeVisible();
    const animation = await reveal.evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });
});
