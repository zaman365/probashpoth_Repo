import { expect, test } from '@playwright/test';

/**
 * The visual language, asserted where it carries meaning rather than decoration:
 * the hero must be readable, its controls must be reachable, and the whole thing must
 * survive a phone with no JavaScript and a user who has asked for less motion.
 */

test('the hero carries the work/study switch in its top corner', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn?intent=study');

  const canvas = page.locator('.pui-canvas').first();
  const heroSwitch = canvas.locator('.intent-switch');
  await expect(heroSwitch).toHaveCount(1);
  await expect(heroSwitch.locator('.is-selected')).toContainText('বিদেশে পড়াশোনা');

  // Top corner: right-aligned inside the canvas, above the headline.
  const canvasBox = await canvas.boundingBox();
  const switchBox = await heroSwitch.boundingBox();
  const headline = await canvas.getByRole('heading', { level: 1 }).boundingBox();
  const canvasRight = (canvasBox?.x ?? 0) + (canvasBox?.width ?? 0);
  const switchRight = (switchBox?.x ?? 0) + (switchBox?.width ?? 0);
  expect(canvasRight - switchRight).toBeLessThan(80);
  expect(switchBox?.y ?? 0).toBeLessThan(headline?.y ?? 0);
});

test('the hero figures follow the selected path', async ({ page }) => {
  await page.goto('/en?intent=work');
  const stats = page.locator('.hero-side-stats');
  await expect(stats).toContainText('Verified job');

  await page.goto('/en?intent=study');
  await expect(page.locator('.hero-side-stats')).toContainText('Courses');
});

test('the hero renders on the painted canvas with its controls', async ({ page }) => {
  await page.goto('/bn');
  const canvas = page.locator('.pui-canvas').first();
  await expect(canvas).toBeVisible();
  await expect(canvas.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(canvas.locator('.pui-chip-link')).toHaveCount(2);
  await expect(canvas.locator('.pui-feature-pill')).toHaveCount(3);
  await expect(canvas.locator('.pui-glass')).toHaveCount(1);
  await expect(canvas.locator('.hero-warning')).toBeVisible();
});

test('controls follow the device sizing rule', async ({ page }) => {
  await page.goto('/bn');

  // A finger gets the §15 minimum; a mouse gets the tighter visual scale.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const floor = coarse ? 48 : 44;

  for (const selector of ['.pui-chip-link', '.hero-verify-input', '.hero-verify-row button']) {
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

  test('the hero verification form still answers (§15)', async ({ page }) => {
    await page.goto('/bn');
    await page.getByLabel('যাচাই নম্বর').fill('BD-QA-2026-00482915');
    await page.getByRole('button', { name: 'এখনই যাচাই করুন' }).click();

    // A well-formed id lands on the page built to answer it.
    await expect(page).toHaveURL(/\/bn\/verify\/job\/BD-QA-2026-00482915$/);
    await expect(page.getByText('যাচাইকৃত চাকরি').first()).toBeVisible();
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
