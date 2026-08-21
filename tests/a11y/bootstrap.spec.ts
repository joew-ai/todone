import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const screen of ['sign in', 'registration'] as const) {
  test(`${screen} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await page.goto('/');
    if (screen === 'registration') {
      await page.getByRole('button', { name: 'Create first-parent account' }).click();
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
