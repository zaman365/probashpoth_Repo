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
  const heroSwitch = page.locator('.post-hero-intent-switch .intent-switch');
  await expect(heroSwitch).toHaveCount(1);
  await expect(canvas.locator('.intent-switch')).toHaveCount(0);
  await expect(page.locator('.experience-hero .post-hero-intent-switch')).toHaveCount(0);
  await expect(heroSwitch.locator('.is-selected')).toContainText('উচ্চশিক্ষা');

  const canvasBox = await canvas.boundingBox();
  const switchBox = await heroSwitch.boundingBox();
  const canvasBottom = (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0);
  expect(switchBox?.y ?? 0).toBeGreaterThan(canvasBottom);
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
  await expect(canvas.locator('.experience-btn-primary')).toHaveCount(1);
  await expect(canvas.locator('.hero-actions .experience-btn')).toHaveCount(2);
  await expect(canvas.locator('.pui-feature-pill')).toHaveCount(3);
  await expect(canvas.locator('.hero-choice-card')).toHaveCount(2);
  await expect(canvas.locator('.hero-warning')).toHaveCount(0);
});

test('the hero listen control is a separate icon-only utility', async ({ page }) => {
  await page.goto('/bn');

  const control = page.locator('.hero-listen-control .listen-button--icon');
  await expect(control).toBeVisible();
  await expect(control).toHaveAttribute('aria-label', 'শুনুন');
  await expect(control).toHaveAttribute('title', 'শুনুন');
  await expect(control.locator('.pui-icon')).toHaveCount(1);
  await expect(page.locator('.hero-utility .listen-button')).toHaveCount(0);
});

test('the two hero actions share one button shape', async ({ page }) => {
  await page.goto('/bn');

  const actions = page.locator('.hero-actions .experience-btn');
  await expect(actions).toHaveCount(2);
  const shapes = await actions.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        height: box.height,
        borderRadius: style.borderRadius,
        paddingBlock: `${style.paddingTop} ${style.paddingBottom}`,
      };
    }),
  );
  expect(shapes[0]).toEqual(shapes[1]);
});

test('the hero ends shortly after its content instead of forcing an empty viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn');

  const canvasBox = await page.locator('.experience-canvas').boundingBox();
  const contentBox = await page.locator('.experience-canvas .hero-grid').boundingBox();
  const canvasBottom = (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0);
  const contentBottom = (contentBox?.y ?? 0) + (contentBox?.height ?? 0);
  expect(canvasBottom - contentBottom).toBeLessThanOrEqual(82);
});

test('the hero starts below the navbar instead of being cropped behind it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/bn');

  const navbarBox = await page.locator('.site-header-row').boundingBox();
  const heroBox = await page.locator('.experience-canvas').boundingBox();
  const headingBox = await page.locator('.experience-canvas .hero-title').boundingBox();
  const navbarBottom = (navbarBox?.y ?? 0) + (navbarBox?.height ?? 0);

  expect(heroBox?.y ?? 0).toBeGreaterThanOrEqual(navbarBottom);
  expect(headingBox?.y ?? 0).toBeGreaterThanOrEqual(navbarBottom + 40);
});

test('controls follow the device sizing rule', async ({ page }) => {
  await page.goto('/bn');

  // A finger gets the §15 minimum; a mouse gets the tighter visual scale.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  const floor = coarse ? 48 : 44;

  for (const selector of [
    '.experience-btn-primary',
    '.hero-choice-card',
    '.intent-switch-option',
  ]) {
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
