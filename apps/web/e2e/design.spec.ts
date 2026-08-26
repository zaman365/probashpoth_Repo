import { expect, test } from '@playwright/test';

/**
 * The visual language, asserted where it carries meaning rather than decoration:
 * the hero must be readable, its controls must be reachable, and the whole thing must
 * survive a phone with no JavaScript and a user who has asked for less motion.
 */

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

test('hero controls keep the 48px tap target rule (§15)', async ({ page }) => {
  await page.goto('/bn');
  for (const selector of ['.pui-chip-link', '.hero-verify-input', '.hero-verify-row button']) {
    const box = await page.locator(selector).first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(48);
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
