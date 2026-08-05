import { expect, test } from '@playwright/test';

/**
 * Runs only through `npm run test:e2e:local-auth`, after
 * `npm run setup:local-cognito`. This deliberately exercises the complete
 * offline flow, rather than substituting an authentication mock.
 */
test('signs into cognito-local and verifies the local JWT through the session endpoint', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Username').fill('localdev');
  await page.getByLabel('Password').fill('LocalDevPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const result = page.getByTestId('signin-success');
  await expect(result).toBeVisible();
  await expect(result).toContainText('Signed in as localdev.');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});
