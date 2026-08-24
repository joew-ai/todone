import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

function jwt(username = 'ChildOne'): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', kid: 'test' })}.${encode({
    sub: 'synthetic-child-sub',
    'cognito:username': username,
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

async function signInAsParent(page: Page): Promise<void> {
  const authenticationResult = {
    IdToken: jwt('ParentOne'),
    AccessToken: jwt('ParentOne'),
    RefreshToken: 'synthetic-refresh',
    ExpiresIn: 3600,
  };
  const respond = async (route: Route) => {
    const target = route.request().headers()['x-amz-target'] ?? '';
    if (target.endsWith('.InitiateAuth')) {
      await route.fulfill({ json: { AuthenticationResult: authenticationResult } });
      return;
    }
    await route.fulfill({ json: {} });
  };
  await page.route('https://cognito-idp.local.amazonaws.com/**', respond);
  await page.route('http://localhost:9229/**', respond);
  await page.route('**/api/v1/memberships/current', (route) =>
    route.fulfill({
      headers: { 'cache-control': 'no-store' },
      json: {
        membership: {
          memberId: 'parent-member',
          username: 'parent-one',
          role: 'parent',
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
        profile: { memberId: 'parent-member', displayName: 'River', color: 'PINE', version: 1 },
      },
    }),
  );
  await page.route('**/api/v1/family-members', (route) =>
    route.fulfill({
      json: {
        members: [
          {
            memberId: 'parent-member',
            username: 'parent-one',
            role: 'parent',
            activationState: 'ACTIVE',
            displayName: 'River',
            color: 'PINE',
            allowedActions: [],
          },
          {
            memberId: 'pending-parent',
            username: 'morgan-vale',
            role: 'parent',
            activationState: 'PENDING_ACTIVATION',
            displayName: 'Morgan Vale',
            color: 'MOSS',
            allowedActions: ['RESEND_WELCOME'],
          },
        ],
      },
    }),
  );
  await page.getByLabel('Username').fill('ParentOne');
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

test('the parent family directory has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');
  await signInAsParent(page);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
