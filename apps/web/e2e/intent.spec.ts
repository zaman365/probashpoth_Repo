import { expect, test } from '@playwright/test';

/**
 * Work and study are the two top-level decisions (§14.1). These specs hold the line
 * on three things: both paths are always described, the choice is in the URL rather
 * than in component state, and neither path is presented as the default good option.
 */

test('the homepage describes both paths, whichever is selected', async ({ page }) => {
  await page.goto('/en');
  const cards = page.locator('.intent-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Work abroad');
  await expect(cards.last()).toContainText('Study abroad');

  // Both summaries are present before any choice is made.
  await expect(page.getByText('you begin earning once you arrive', { exact: false })).toBeVisible();
  await expect(page.getByText('You pay first and earn later', { exact: false })).toBeVisible();
});

test('the selection lives in the URL and survives a reload', async ({ page }) => {
  await page.goto('/en?intent=study');

  // The switch appears twice — in the hero and above the cards — and both read the
  // same URL, so they can never disagree about what is selected.
  const switches = page.locator('.intent-switch');
  await expect(switches).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const selected = switches.nth(index).locator('.is-selected');
    await expect(selected).toHaveCount(1);
    await expect(selected).toContainText('Study abroad');
  }

  await page.reload();
  await expect(page.locator('.intent-switch').first().locator('.is-selected')).toContainText(
    'Study abroad',
  );
});

test('the toggle is a pair of links, so it works with no JavaScript', async ({ page }) => {
  await page.goto('/en');
  const options = page.locator('.intent-switch').first().locator('.intent-switch-option');
  await expect(options).toHaveCount(2);
  await expect(options.first()).toHaveAttribute('href', '/en?intent=work');
  await expect(options.last()).toHaveAttribute('href', '/en?intent=study');
});

test('the comparison answers the same six questions for both paths', async ({ page }) => {
  await page.goto('/en');
  const rows = page.locator('.compare-table tbody tr');
  await expect(rows).toHaveCount(6);

  for (const question of [
    'Who it suits',
    'What it takes',
    'The money',
    'Time',
    'The main risk',
    'What we verify',
  ]) {
    await expect(page.getByRole('rowheader', { name: question })).toBeVisible();
  }

  // Every question is answered for both columns — no empty cells to fill in later.
  const cells = page.locator('.compare-table tbody td');
  await expect(cells).toHaveCount(12);
  for (let i = 0; i < 12; i += 1) {
    await expect(cells.nth(i)).not.toBeEmpty();
  }
});

test('the work hub leads with routes, demand and the lawful cost', async ({ page }) => {
  await page.goto('/en/work');
  await expect(page.getByRole('heading', { level: 1, name: 'Work abroad' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Steps on the work path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Routes on this path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Occupations in demand' })).toBeVisible();
  await expect(
    page.getByText('Maximum lawful cost to you', { exact: false }).first(),
  ).toBeVisible();
});

test('the study hub leads with routes, courses and the exams', async ({ page }) => {
  await page.goto('/en/study');
  await expect(page.getByRole('heading', { level: 1, name: 'Study abroad' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Steps on the study path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Courses and institutions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Exams you may need' })).toBeVisible();

  // The study data is demo data, and the page says so rather than implying otherwise.
  await expect(page.getByText('all of the data is demo', { exact: false })).toBeVisible();
});

test('each hub offers the other path rather than trapping the reader', async ({ page }) => {
  await page.goto('/en/work');
  await expect(page.getByRole('link', { name: 'Open the study path' })).toBeVisible();
  await page.goto('/en/study');
  await expect(page.getByRole('link', { name: 'Open the work path' })).toBeVisible();
});

test('the layout uses a large screen and never scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await page.goto('/en');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // The hero canvas and the navigation bar share one container, to the pixel.
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? element.getBoundingClientRect() : null;
    };
    const header = rect('.site-header-row');
    const canvas = rect('.pui-canvas');
    return {
      headerLeft: Math.round(header?.left ?? -1),
      canvasLeft: Math.round(canvas?.left ?? -2),
      headerWidth: Math.round(header?.width ?? 0),
      canvasWidth: Math.round(canvas?.width ?? 0),
    };
  });
  expect(geometry.headerLeft).toBe(geometry.canvasLeft);
  expect(geometry.headerWidth).toBe(geometry.canvasWidth);
  // And it actually uses the screen rather than sitting in a narrow column.
  expect(geometry.canvasWidth).toBeGreaterThan(1300);
});
