import { expect, test } from '@playwright/test';

/**
 * Production foundation smoke test (docs/operations/deployment-rollback.md
 * "Foundation smoke test"). Requires PRODUCTION_URL, SMOKE_USERNAME, and
 * SMOKE_PASSWORD env vars for a verification-only account that already
 * exists in the real Cognito pool. Never run against a pool containing
 * real family accounts, and never print/persist SMOKE_PASSWORD anywhere.
 */

const USERNAME = process.env.SMOKE_USERNAME;
const PASSWORD = process.env.SMOKE_PASSWORD;

test.describe('Production foundation smoke test', () => {
  test.skip(!USERNAME || !PASSWORD, 'SMOKE_USERNAME/SMOKE_PASSWORD not set.');

  test('shell loads, sign-in succeeds, protected contract is exact, sign-out and unauth are rejected', async ({
    page,
    request,
  }) => {
    // Safe diagnostics only: console text and network failure reasons
    // never include form field values.
    page.on('console', (msg) => console.log(`[browser console:${msg.type()}]`, msg.text()));
    page.on('pageerror', (err) => console.log('[browser pageerror]', err.message));
    page.on('requestfailed', (req) =>
      console.log('[requestfailed]', req.url(), req.failure()?.errorText),
    );

    // 1. Shell loads.
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Todone' })).toBeVisible();

    // 2. Keyboard focus / labels at this viewport.
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // 3. Sign in with the verification-only account (credentials only ever
    // flow through Playwright's own fill(), never printed/logged by us).
    await page.getByLabel('Username').fill(USERNAME!);
    await page.getByLabel('Password').fill(PASSWORD!);

    const sessionResponse = page.waitForResponse(
      (res) => res.url().includes('/api/v1/session') && res.request().method() === 'GET',
    );
    await page.getByRole('button', { name: 'Sign in' }).click();
    const response = await sessionResponse;

    // 4. Exact contract: sub, username, expiresAt -- nothing else.
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['expiresAt', 'sub', 'username']);
    expect(body.username).toBe(USERNAME);

    await expect(page.getByTestId('signin-success')).toBeVisible();

    // 5. Sign out clears private state.
    await page.getByTestId('signin-signout').click();
    await expect(page.getByLabel('Username')).toBeVisible();
    const storageState = await page.evaluate(() => ({
      localStorageLength: window.localStorage.length,
      sessionStorageLength: window.sessionStorage.length,
    }));
    expect(storageState.localStorageLength).toBe(0);
    expect(storageState.sessionStorageLength).toBe(0);

    // 6. Unauthenticated request is rejected with no session data.
    const unauth = await request.get('/api/v1/session');
    expect(unauth.status()).toBe(401);
    const unauthBody = await unauth.json();
    expect(unauthBody).toEqual({ message: 'Unauthorized' });
  });
});
