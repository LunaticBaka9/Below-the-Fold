import { test, expect } from '@playwright/test';

test('desktop narrative, commerce preview, recording, and reset work end to end', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('Lull — Your best days begin at night');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your best days');
  await expect(page.locator('.hero__visual')).toBeVisible();

  const imagesLoaded = await page.locator('.hero__visual img').evaluate((image) => image.complete && image.naturalWidth > 0);
  expect(imagesLoaded).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('h1').evaluate((heading) => Math.round(heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight)))).toBe(2);

  await page.getByRole('button', { name: 'Next sleep story' }).click();
  await expect(page.locator('.story-quote blockquote')).toContainText('I fall asleep before');
  await page.getByRole('button', { name: 'Next sleep story' }).click();
  await expect(page.locator('.story-quote blockquote')).toContainText('hallway');

  await page.locator('.header-cta').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Reserve the preview' }).click();
  await expect(page.getByRole('heading', { name: 'Sleep well.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.locator('#night-eight').scrollIntoViewIfNeeded();
  await expect(page.locator('html')).toHaveAttribute('data-stage', '2');
  await page.locator('#recording').scrollIntoViewIfNeeded();
  await expect(page).toHaveTitle('DON’T LOOK AWAY');
  await page.getByRole('button', { name: 'Play night recording' }).click();
  await expect(page.locator('.recorder')).toHaveClass(/is-playing/);
  await expect(page.locator('.transcript')).toContainText('Don’t open your eyes', { timeout: 6000 });
  await page.getByRole('button', { name: 'Pause night recording' }).click();
  await expect(page.locator('.recorder')).not.toHaveClass(/is-playing/);

  await page.locator('#ending').evaluate((element) => window.scrollTo(0, element.offsetTop + element.offsetHeight - window.innerHeight));
  await expect(page.locator('.ending')).toHaveClass(/is-final/);
  await expect(page.getByRole('heading', { name: 'DON’T TURN AROUND.' })).toBeVisible();
  await page.locator('#ending').getByRole('button', { name: 'WAKE UP', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  await expect(page).toHaveTitle('Lull — Your best days begin at night');
  expect(errors).toEqual([]);
});

test('mobile layout and navigation stay usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.locator('h1').evaluate((heading) => Math.round(heading.getBoundingClientRect().height / parseFloat(getComputedStyle(heading).lineHeight)))).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
  await expect(page.locator('.mobile-menu')).toHaveClass(/is-open/);
  await page.locator('.mobile-menu').getByRole('button', { name: 'Our science' }).click();
  await expect(page.locator('.mobile-menu')).not.toHaveClass(/is-open/);
  await expect.poll(() => page.evaluate(() => Math.abs(document.querySelector('#science').getBoundingClientRect().top))).toBeLessThan(100);

  for (const selector of ['#system', '.product-story', '#science', '#stories', '#night-eight', '.room-evidence', '#recording', '#ending']) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.locator('#ending').evaluate((element) => window.scrollTo(0, element.offsetTop + element.offsetHeight - window.innerHeight));
  await expect(page.locator('.ending__final')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-ending.png', fullPage: false });
});

test('reduced-motion preference exposes content and keeps navigation functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Meet Lull', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Enable ambient sound' }).click();
  await expect(page.getByRole('button', { name: 'Mute ambient sound' })).toHaveAttribute('aria-pressed', 'true');
});
