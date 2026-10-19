import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';

const membership = {
  memberId: 'synthetic-member',
  role: 'parent',
  household: { householdId: 'synthetic-house', name: 'River House', timezone: 'America/Chicago' },
};

const childMembership = {
  memberId: 'synthetic-child',
  role: 'child',
  household: { householdId: 'synthetic-house', name: 'River House', timezone: 'America/Chicago' },
};

interface ProfileFixture {
  memberId: string;
  displayName: string;
  color: 'PINE' | 'LAKE';
  version: number;
}

interface DirectoryMember {
  memberId: string;
  username: string;
  role: 'parent' | 'child';
  activationState: 'ACTIVE' | 'PENDING_ACTIVATION';
  displayName: string;
  color: ProfileFixture['color'];
  allowedActions: string[];
}

const existingProfile: ProfileFixture = {
  memberId: 'synthetic-member',
  displayName: 'River',
  color: 'PINE',
  version: 1,
};

function jwt(tokenUse: 'id' | 'access'): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', kid: 'test' })}.${encode({
    sub: 'synthetic-sub',
    'cognito:username': 'ParentOne',
    token_use: tokenUse,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    aud: 'test-client',
    client_id: 'test-client',
    iss: 'https://example.invalid/test',
  })}.test-signature`;
}

async function mockCognito(page: Page): Promise<void> {
  const respond = async (route: Route) => {
    const target = route.request().headers()['x-amz-target'] ?? '';
    if (target.endsWith('.InitiateAuth')) {
      await route.fulfill({
        json: {
          AuthenticationResult: {
            IdToken: jwt('id'),
            AccessToken: jwt('access'),
            RefreshToken: 'synthetic-refresh',
            ExpiresIn: 3600,
          },
        },
      });
      return;
    }
    if (target.endsWith('.SignUp')) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body).not.toHaveProperty('householdId');
      await route.fulfill({ json: { UserConfirmed: false, UserSub: 'synthetic-sub' } });
      return;
    }
    if (target.endsWith('.ForgotPassword')) {
      await route.fulfill({
        json: {
          CodeDeliveryDetails: {
            DeliveryMedium: 'EMAIL',
            Destination: 'p***@e***',
            AttributeName: 'email',
          },
        },
      });
      return;
    }
    await route.fulfill({ json: {} });
  };
  await page.route('https://cognito-idp.local.amazonaws.com/**', respond);
  await page.route('http://localhost:9229/**', respond);
}

/** Keeps browser tests at the HTTP boundary while supplying §3 server state. */
async function mockProfileAndDirectory(
  page: Page,
  initialProfile: ProfileFixture | null,
  directoryMembers?: DirectoryMember[],
): Promise<void> {
  let profile = initialProfile;
  await page.route('**/api/v1/profiles/me', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { profile } });
      return;
    }

    const input = route.request().postDataJSON() as Pick<
      ProfileFixture,
      'displayName' | 'color' | 'version'
    >;
    profile = {
      memberId: membership.memberId,
      displayName: input.displayName,
      color: input.color,
      version: (profile?.version ?? 0) + 1,
    };
    await route.fulfill({ status: initialProfile ? 200 : 201, json: { profile } });
  });
  await page.route('**/api/v1/family-members', async (route) => {
    await route.fulfill({
      json: {
        members: profile
          ? (directoryMembers ?? [
              {
                memberId: profile.memberId,
                username: 'parentone',
                role: 'parent',
                activationState: 'ACTIVE',
                displayName: profile.displayName,
                color: profile.color,
                allowedActions: [],
              },
            ])
          : [],
      },
    });
  });
}

async function signIn(
  page: Page,
  currentMembership: () => typeof membership | typeof childMembership | null,
): Promise<void> {
  await page.route('**/api/v1/memberships/current', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'cache-control': 'no-store' },
      json: { membership: currentMembership() },
    }),
  );
  await page.getByLabel('Username').fill('ParentOne');
  await page.getByLabel('Password').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function captureFoundationSurface(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const viewport = page.viewportSize()!;
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath(`${name}-320.png`), fullPage: true });
  // Text enlargement is portable across engines; actual browser zoom still requires human review.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.screenshot({ path: testInfo.outputPath(`${name}-text-200.png`), fullPage: true });
  const overflowing = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .map(
        (element) =>
          `${element.tagName}.${element.className}: ${element.getBoundingClientRect().right}`,
      ),
  );
  expect(overflowing).toEqual([]);
  const escapedColorLabels = await page
    .locator('.profile-color-option__label')
    .evaluateAll((labels) =>
      labels
        .filter((label) => {
          const option = label.closest('label')!.getBoundingClientRect();
          const text = document.createRange();
          text.selectNodeContents(label);
          return Array.from(text.getClientRects()).some((rect) => rect.right > option.right + 1);
        })
        .map((label) => label.textContent),
    );
  expect(escapedColorLabels).toEqual([]);
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('font-size');
  });
  await page.setViewportSize(viewport);
}

test.beforeEach(async ({ page }) => {
  await mockCognito(page);
  await page.goto('/');
});

const resetChild: DirectoryMember = {
  memberId: 'reset-child',
  username: 'juniper',
  displayName: 'Juniper River',
  role: 'child',
  activationState: 'ACTIVE',
  color: 'LAKE',
  allowedActions: [],
};

test('child password reset validates, submits once, and clears secrets across history and reload', async ({
  page,
}, testInfo) => {
  await mockProfileAndDirectory(page, existingProfile, [resetChild]);
  let writes = 0;
  await page.route('**/api/v1/family-members/reset-child/password', async (route) => {
    writes++;
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toEqual({ password: 'Replacement1!' });
    await route.fulfill({ status: 204 });
  });
  await signIn(page, () => membership);
  await page.getByRole('link', { name: 'Reset child password' }).click();
  await expect(page).toHaveURL(/\/family\/children\/reset-child\/password$/);
  await expect(page.getByRole('heading', { name: 'Reset child password' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('child-password-reset.png'), fullPage: true });
  const password = page.getByLabel('New password', { exact: true });
  await password.fill('weak');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toBeFocused();
  expect(writes).toBe(0);
  await password.fill('Replacement1!');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole('status')).toContainText('Child password reset.');
  await page.getByRole('link', { name: 'Reset child password' }).click();
  await expect(password).toHaveValue('');
  await password.fill('NeverPersist1!');
  await page.goBack();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/family\/children\/reset-child\/password$/);
  await expect(page.getByRole('heading', { name: 'Reset child password' })).toBeVisible();
  await expect(password).toHaveValue('');
  await page.reload();
  await expect(password).toHaveValue('');
  expect(writes).toBe(1);
  expect(page.url()).not.toContain('NeverPersist');
  expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('NeverPersist');
});

test('unavailable reset targets safely return to family management', async ({ page }) => {
  await mockProfileAndDirectory(page, existingProfile, [resetChild]);
  await signIn(page, () => membership);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  await page.goto('/family/children/absent/password');
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
});

test('uncertain child reset failure clears the password and prevents a second submission', async ({
  page,
}) => {
  await mockProfileAndDirectory(page, existingProfile, [resetChild]);
  let writes = 0;
  await page.route('**/api/v1/family-members/reset-child/password', async (route) => {
    writes++;
    await route.fulfill({ status: 500, json: { error: { message: 'Safe error' } } });
  });
  await signIn(page, () => membership);
  await page.getByRole('link', { name: 'Reset child password' }).click();
  await page.getByLabel('New password', { exact: true }).fill('Replacement1!');
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Reset password', exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/family$/);
  expect(writes).toBe(1);
});

test('registers, verifies email, signs in, creates a household, and reaches onboarding', async ({
  page,
}, testInfo) => {
  let currentMembership: typeof membership | null = null;
  await page.getByRole('button', { name: 'Create first-parent account' }).click();
  await page.getByLabel('Username').fill('ParentOne');
  await page.getByLabel('Recovery email').fill('parent@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('StrongPassword123!');
  await page.getByLabel('Entry Code').fill('synthetic-gate');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Verify your recovery email' })).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Entry Code')).toHaveValue('');
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Verify your recovery email' })).toBeVisible();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.route('**/api/v1/memberships/current', (route) =>
    route.fulfill({ json: { membership: null } }),
  );
  await page.route('**/api/v1/households', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ name: 'River House', timezone: 'America/Chicago' });
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    await route.fulfill({
      status: 201,
      headers: { 'cache-control': 'no-store' },
      json: { membership },
    });
    currentMembership = membership;
  });
  await mockProfileAndDirectory(page, null);
  await signIn(page, () => currentMembership);
  await expect(page.getByRole('heading', { name: 'Create your household' })).toBeVisible();
  await captureFoundationSurface(page, testInfo, 'household-setup');
  await page.getByLabel('Household name').fill('River House');
  await page.getByLabel('Household timezone').selectOption('America/Chicago');
  await page.getByRole('button', { name: 'Create household' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
  await captureFoundationSurface(page, testInfo, 'profile-setup');
  await page.getByLabel('Display name').fill('River');
  await page.getByLabel('Lake').check();
  await page.getByRole('button', { name: 'Continue to family management' }).click();
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  await expect(page.getByText('River House')).toBeVisible();
  await expect(page.getByText('@parentone')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Application' })).toContainText('Family');
  await expect(page.getByRole('navigation', { name: 'Application' })).toContainText('My profile');
});

test('restores only the current tab from sessionStorage and completely clears sign-out state', async ({
  page,
}) => {
  await mockProfileAndDirectory(page, existingProfile);
  await signIn(page, () => membership);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  await expect(page.getByText('River House')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Family' })).toHaveClass(/router-link-exact-active/);
  await page.getByRole('link', { name: 'Edit my profile' }).first().click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Edit my profile' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My profile' })).toHaveClass(
    /router-link-exact-active/,
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key === 'todone.auth.test-client.localSession'),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(page.url()).not.toContain(jwt('id'));

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Family management' })).toBeVisible();
  const indexedDatabases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name),
  );
  expect(indexedDatabases).toEqual([]);
  const privateCacheEntries = await page.evaluate(async () => {
    const entries = await Promise.all(
      (await caches.keys()).map(async (name) => (await caches.open(name)).keys()),
    );
    return entries.flat().filter((request) => request.url.includes('/api/'));
  });
  expect(privateCacheEntries).toEqual([]);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('River House')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter(
        (key) => key.includes('CognitoIdentityServiceProvider') || key.startsWith('todone.auth.'),
      ),
    ),
  ).toEqual([]);
});

test('renders a readable active and pending family directory without invented actions', async ({
  page,
}, testInfo) => {
  await mockProfileAndDirectory(page, existingProfile, [
    {
      memberId: membership.memberId,
      username: 'parentone',
      role: 'parent',
      activationState: 'ACTIVE',
      displayName: 'River',
      color: 'PINE',
      allowedActions: [],
    },
    {
      memberId: 'child-member',
      username: 'juniper-and-the-river-stone',
      role: 'child',
      activationState: 'ACTIVE',
      displayName: 'A very long family display name that still wraps naturally',
      color: 'LAKE',
      allowedActions: [],
    },
    {
      memberId: 'pending-parent',
      username: 'morgan-vale',
      role: 'parent',
      activationState: 'PENDING_ACTIVATION',
      displayName: 'Morgan Vale',
      color: 'PINE',
      allowedActions: ['RESEND_WELCOME', 'CHANGE_EMAIL_AND_RESEND', 'CANCEL_PENDING_ACCOUNT'],
    },
  ]);
  await signIn(page, () => membership);

  const directory = page.getByRole('list', { name: 'Household members' });
  await expect(directory).toContainText('@juniper-and-the-river-stone');
  await expect(directory).not.toContainText('Child');
  await expect(directory).not.toContainText('Active');
  await expect(directory).not.toContainText('Lake');
  await expect(directory.getByText('Parent', { exact: true })).toHaveCount(2);
  await expect(directory).toContainText('Morgan Vale');
  await expect(directory).toContainText('Pending activation');
  await expect(directory.getByRole('button')).toHaveCount(0);
  await captureFoundationSurface(page, testInfo, 'family-long-content');
});

test('creates a child from the parent-only route without placing its password in the URL', async ({
  page,
}) => {
  await mockProfileAndDirectory(page, existingProfile);
  await page.route('**/api/v1/family-members/children', async (route) => {
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    expect(route.request().postDataJSON()).toEqual({
      username: 'child-one',
      displayName: 'Child One',
      color: 'PINE',
      password: 'ChildPassword1!',
    });
    await route.fulfill({
      status: 201,
      json: {
        member: {
          memberId: 'child-member',
          username: 'child-one',
          displayName: 'Child One',
          role: 'child',
          activationState: 'ACTIVE',
          color: 'PINE',
          allowedActions: [],
        },
      },
    });
  });
  await signIn(page, () => membership);

  await page.getByRole('link', { name: 'Create child account' }).click();
  await expect(page).toHaveURL(/\/family\/children\/new$/);
  await expect(
    page.getByText('including an uppercase letter, lowercase letter, number, and symbol'),
  ).toBeVisible();
  await page.getByLabel('Username').fill('Child-One');
  await page.getByLabel('Child display name').fill('Child One');
  await page.getByLabel('Pine').check();
  await page.getByLabel('Child password').fill('ChildPassword1!');
  await page.getByRole('button', { name: 'Create child account', exact: true }).click();

  await expect(page).toHaveURL(/\/family$/);
  expect(page.url()).not.toContain('ChildPassword1!');
});

test('supports parent Forgot Password without account disclosure', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Username').fill('UnknownOrParent');
  await page.getByRole('button', { name: 'Send recovery code' }).click();
  await expect(page.getByText('If the account is eligible')).toBeVisible();
  await page.getByLabel('Recovery code').fill('123456');
  await page.getByLabel('New password').fill('NewStrongPassword123!');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Password reset. Sign in with your new password.')).toBeVisible();
});

test('blocks a weak replacement password during recovery', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Username').fill('ParentOne');
  await page.getByRole('button', { name: 'Send recovery code' }).click();
  await page.getByLabel('Recovery code').fill('123456');
  const password = page.getByLabel('New password');
  await password.fill('weak');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.locator('#reset-password-error')).toContainText('uppercase letter');
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
});

test('distinguishes the Entry Code and blocks a weak selected account password', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Create first-parent account' }).click();
  await expect(page.getByLabel('Entry Code')).toBeVisible();
  await expect(page.getByText('It is not your account password.')).toBeVisible();
  await page.getByLabel('Username').fill('ParentOne');
  await page.getByLabel('Recovery email').fill('parent@example.invalid');
  const password = page.getByLabel('Password', { exact: true });
  await password.fill('weak');
  await page.getByLabel('Entry Code').fill('synthetic-gate');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('#registration-password-error')).toContainText('uppercase letter');
  await expect(password).toBeFocused();
  await expect(password).toHaveAttribute('aria-invalid', 'true');
});

test('requires a selectable timezone when browser detection is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      return { ...original.call(this), timeZone: '' };
    };
  });
  await page.reload();
  await signIn(page, () => null);
  await expect(page.getByLabel('Household timezone')).toHaveValue('');
  await expect(page.getByLabel('Household timezone')).toHaveAttribute('required', '');
});

test('keeps verification identity out of the URL while allowing direct route entry', async ({
  page,
}) => {
  await page.goto('/verify-email');

  await expect(page).toHaveURL(/\/verify-email$/);
  const heading = page.getByRole('heading', { name: 'Verify your recovery email' });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page).toHaveTitle('Verify email · Todone');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Verification code')).toBeVisible();
  expect(page.url()).not.toContain('?');
  expect(page.url()).not.toContain('#');
});

test('routes an active child to the Todo work-in-progress page without Todo traffic', async ({
  page,
}, testInfo) => {
  let todoRequests = 0;
  await page.route('**/api/v1/todos**', async (route) => {
    todoRequests += 1;
    await route.abort();
  });
  await page.route('**/api/v1/memberships/current', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'cache-control': 'no-store' },
      json: { membership: childMembership },
    }),
  );
  await mockProfileAndDirectory(page, {
    memberId: childMembership.memberId,
    displayName: 'Moss',
    color: 'PINE',
    version: 1,
  });

  await page.getByLabel('Username').fill('ChildOne');
  await page.getByLabel('Password').fill('StrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/todos$/);
  const heading = page.getByRole('heading', { name: 'Todos' });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page).toHaveTitle('Todos · Todone');
  await expect(page.getByText('Work in progress')).toBeVisible();
  await captureFoundationSurface(page, testInfo, 'child-todos');
  await expect(page.getByRole('button', { name: /complete|create/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Application' })).toContainText('My Todos');
  await expect(page.getByRole('navigation', { name: 'Application' })).toContainText('My profile');
  await expect(page.locator('html')).toHaveAttribute('data-profile-color', 'PINE');
  await page.evaluate(() => {
    const observed: string[] = [];
    Object.assign(window, { foundationNavigationScreens: observed });
    new MutationObserver(() => {
      if (document.querySelector('main')?.textContent?.includes('Restoring your private session')) {
        observed.push('restoring');
      }
    }).observe(document.querySelector('main')!, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  let profileReads = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/v1/profiles/me') && request.method() === 'GET') profileReads++;
  });
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Edit my profile' })).toBeFocused();
  expect(profileReads).toBe(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/todos$/);
  await expect(heading).toBeFocused();
  expect(profileReads).toBe(2);
  expect(await page.evaluate(() => Reflect.get(window, 'foundationNavigationScreens'))).toEqual([]);
  expect(todoRequests).toBe(0);
  // Leave a protected page behind sign-in in history so Back exercises its guard.
  await page.getByRole('link', { name: 'My profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edit my profile' })).toBeFocused();
  await page.getByRole('link', { name: 'My Todos', exact: true }).click();
  await expect(heading).toBeFocused();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Application' })).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-profile-color');
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter(
        (key) => key.startsWith('todone.auth.') || key.includes('CognitoIdentityServiceProvider'),
      ),
    ),
  ).toEqual([]);
  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
