import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Application shell accessibility', () => {
  test('has no detectable automated accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Sign in' })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
