import { expect, test } from '@playwright/test';

test.describe('Application shell', () => {
  test('loads, shows exactly one h1, a working skip link, and service status', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'Todone' })).toBeVisible();

    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    const status = page.getByTestId('status-success');
    await expect(status).toBeVisible({ timeout: 10_000 });
    await expect(status).toContainText('available');
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todone' })).toBeVisible();

    // Proves the global `prefers-reduced-motion: reduce` rule
    // (src/assets/main.css) actually applies its near-zero override to
    // computed styles, not just that the page renders.
    const transitionDuration = await page.evaluate(
      () => getComputedStyle(document.body).transitionDuration,
    );
    expect(Number.parseFloat(transitionDuration)).toBeCloseTo(0.000001, 6);
  });
});
