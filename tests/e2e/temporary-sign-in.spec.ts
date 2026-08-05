import { expect, test } from '@playwright/test';

test.describe('Temporary sign-in probe', () => {
  test('is keyboard operable and shows an accessible, retryable error without crashing the shell', async ({
    page,
  }) => {
    await page.goto('/');

    const usernameField = page.getByLabel('Username');
    const passwordField = page.getByLabel('Password');

    await usernameField.click();
    await usernameField.fill('parent1');
    await page.keyboard.press('Tab');
    await expect(passwordField).toBeFocused();
    await passwordField.fill('whatever-password');

    await page.getByRole('button', { name: 'Sign in' }).click();

    // This exercises a graceful failure in either supported local setup:
    // without `.env.local` it is a configuration failure; after the local
    // Cognito bootstrap it is an invalid-credentials failure. In both cases
    // the shell must not crash, the error must be retryable, and the
    // non-secret username must remain available for correction.
    const error = page.getByTestId('signin-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveText(
      /^(Something went wrong\. Please try again\.|Incorrect username or password\.)$/,
    );
    await expect(usernameField).toHaveValue('parent1');

    await expect(page.getByRole('heading', { level: 1, name: 'Todone' })).toBeVisible();

    const retryButton = page.getByRole('button', { name: 'Retry' });
    await expect(retryButton).toBeVisible();
    await retryButton.focus();
    await expect(retryButton).toBeFocused();
  });
});
