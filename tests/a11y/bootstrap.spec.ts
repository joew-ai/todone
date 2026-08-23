import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

function jwt(): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', kid: 'test' })}.${encode({
    sub: 'synthetic-child-sub',
    'cognito:username': 'ChildOne',
    token_use: 'id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    aud: 'test-client',
    iss: 'https://example.invalid/test',
  })}.test-signature`;
}

async function signInAsChild(page: Page): Promise<void> {
  await page.route('https://cognito-idp.local.amazonaws.com/**', async (route: Route) => {
    const target = route.request().headers()['x-amz-target'] ?? '';
    if (target.endsWith('.InitiateAuth')) {
      await route.fulfill({
        json: {
          AuthenticationResult: {
            IdToken: jwt(),
            AccessToken: jwt(),
            RefreshToken: 'synthetic-refresh',
            ExpiresIn: 3600,
          },
        },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });
  await page.route('http://localhost:9229/**', async (route: Route) => {
    const target = route.request().headers()['x-amz-target'] ?? '';
    if (target.endsWith('.InitiateAuth')) {
      await route.fulfill({
        json: {
          AuthenticationResult: {
            IdToken: jwt(),
            AccessToken: jwt(),
            RefreshToken: 'synthetic-refresh',
            ExpiresIn: 3600,
          },
        },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });
  await page.route('**/api/v1/memberships/current', (route) =>
    route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: {
        membership: {
          memberId: 'child-member',
          username: 'child-one',
          role: 'child',
          household: {
            householdId: 'house-one',
            name: 'River House',
            timezone: 'America/Chicago',
          },
        },
      },
    }),
  );
  await page.route('**/api/v1/profiles/me', (route) =>
    route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: {
        profile: { memberId: 'child-member', displayName: 'Moss', color: 'MOSS', version: 1 },
      },
    }),
  );
  await page.getByLabel('Username').fill('ChildOne');
  await page.getByLabel('Password').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

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

test('the child Todo work-in-progress route has no detectable WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await signInAsChild(page);
  await expect(page.getByRole('heading', { name: 'Todos' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
