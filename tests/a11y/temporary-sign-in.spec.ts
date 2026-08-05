import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Temporary sign-in accessibility', () => {
  test('has no detectable automated accessibility violations in the initial form', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByLabel('Username')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('has no detectable automated accessibility violations once a retryable error is shown', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByLabel('Username').fill('parent1');
    await page.getByLabel('Password').fill('whatever-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByTestId('signin-error')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
