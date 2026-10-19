import { expect, test } from '@playwright/test';

/** Run after setup:local-cognito and dev:full. No mocked auth or API responses. */
test('creates a usable child and refuses an unsupported local reset before changing its password', async ({
  page,
}) => {
  const childUsername = `child-${Date.now().toString(36)}`;
  const childPassword = `LocalChild${Date.now()}!`;
  await page.goto('/');
  await page.getByLabel('Username', { exact: true }).fill('localdev');
  await page.getByLabel('Password', { exact: true }).fill('LocalDevPass123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(
    /Create your household|Set up your profile|Family management/,
  );
  if (await page.getByRole('heading', { name: 'Create your household' }).isVisible()) {
    await page.getByLabel('Household name', { exact: true }).fill('Local Test Household');
    await page.getByLabel('Household timezone').selectOption('America/Chicago');
    await page.getByRole('button', { name: 'Create household', exact: true }).click();
  }
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(
    /Set up your profile|Family management/,
  );
  if (await page.getByRole('heading', { name: 'Set up your profile' }).isVisible()) {
    await page.getByLabel('Display name', { exact: true }).fill('Local Parent');
    await page.getByLabel('Pine', { exact: true }).check();
    await page.getByRole('button', { name: 'Continue to family management', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  await page.getByRole('link', { name: 'Create child account' }).click();
  await page.getByLabel('Username', { exact: true }).fill(childUsername);
  await page.getByLabel('Child display name', { exact: true }).fill('Local Child');
  await page.getByLabel('Lake', { exact: true }).check();
  await page.getByLabel('Child password', { exact: true }).fill(childPassword);
  await page.getByRole('button', { name: 'Create child account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  const row = page.getByRole('listitem').filter({ hasText: `@${childUsername}` });
  await row.getByRole('link', { name: 'Reset child password' }).click();
  await page.getByLabel('New password', { exact: true }).fill(`Changed${Date.now()}!`);
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No password was changed.');
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill(childUsername);
  await page.getByLabel('Password', { exact: true }).fill(childPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/todos$/);
  await expect(page.getByRole('heading', { name: 'Todos', exact: true })).toBeVisible();
});
