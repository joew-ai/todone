import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const signInMock = vi.fn();
const signOutMock = vi.fn();
const loadAuthConfigMock = vi.fn(() => ({
  userPoolId: 'pool-id',
  clientId: 'client-id',
  region: 'us-east-1',
}));

vi.mock('../../config/authConfig', () => ({
  loadAuthConfig: loadAuthConfigMock,
}));

vi.mock('../../services/authClient', () => ({
  AuthClient: class {
    signIn = signInMock;
    signOut = signOutMock;
  },
}));

const fetchSessionMock = vi.fn();
vi.mock('../../services/sessionClient', () => ({
  fetchSession: fetchSessionMock,
}));

const { default: TemporarySignIn } = await import('../../components/TemporarySignIn.vue');

async function fillAndSubmit(
  wrapper: ReturnType<typeof mount>,
  username: string,
  password: string,
) {
  await wrapper.get('#signin-username').setValue(username);
  await wrapper.get('#signin-password').setValue(password);
  await wrapper.get('form').trigger('submit');
}

describe('TemporarySignIn', () => {
  beforeEach(() => {
    signInMock.mockReset();
    signOutMock.mockReset();
    fetchSessionMock.mockReset();
    loadAuthConfigMock.mockReturnValue({
      userPoolId: 'pool-id',
      clientId: 'client-id',
      region: 'us-east-1',
    });
  });

  it('signs in and displays session info returned by the protected endpoint', async () => {
    signInMock.mockResolvedValue({
      kind: 'success',
      session: { idToken: 'jwt', accessToken: 'a', expiresAt: new Date() },
    });
    fetchSessionMock.mockResolvedValue({
      kind: 'success',
      data: { sub: 'sub-1', username: 'parent1', expiresAt: '2026-01-01T00:00:00.000Z' },
    });

    const wrapper = mount(TemporarySignIn);
    await fillAndSubmit(wrapper, 'parent1', 'correct-password');
    await flushPromises();

    expect(fetchSessionMock).toHaveBeenCalledWith('jwt');
    expect(wrapper.get('[data-testid="signin-success"]').text()).toContain('parent1');
    expect(wrapper.find('#signin-password').exists()).toBe(false);
  });

  it('shows a retryable error and preserves the username on invalid credentials', async () => {
    signInMock.mockResolvedValue({
      kind: 'error',
      message: 'Incorrect username or password.',
      recoverable: true,
    });

    const wrapper = mount(TemporarySignIn);
    await fillAndSubmit(wrapper, 'parent1', 'wrong-password');
    await flushPromises();

    expect(wrapper.get('[data-testid="signin-error"]').text()).toBe(
      'Incorrect username or password.',
    );
    expect((wrapper.get('#signin-username').element as HTMLInputElement).value).toBe('parent1');
    expect(wrapper.get('[data-testid="signin-retry"]').exists()).toBe(true);
    expect(fetchSessionMock).not.toHaveBeenCalled();
  });

  it('shows the same error handling when the session call fails after a successful sign-in', async () => {
    signInMock.mockResolvedValue({
      kind: 'success',
      session: { idToken: 'jwt', accessToken: 'a', expiresAt: new Date() },
    });
    fetchSessionMock.mockResolvedValue({
      kind: 'error',
      message: 'Your session could not be verified. Please sign in again.',
      recoverable: true,
    });

    const wrapper = mount(TemporarySignIn);
    await fillAndSubmit(wrapper, 'parent1', 'correct-password');
    await flushPromises();

    expect(wrapper.get('[data-testid="signin-error"]').text()).toBe(
      'Your session could not be verified. Please sign in again.',
    );
  });

  it('signs out, clears fields, and returns to the signed-out form', async () => {
    signInMock.mockResolvedValue({
      kind: 'success',
      session: { idToken: 'jwt', accessToken: 'a', expiresAt: new Date() },
    });
    fetchSessionMock.mockResolvedValue({
      kind: 'success',
      data: { sub: 'sub-1', username: 'parent1', expiresAt: '2026-01-01T00:00:00.000Z' },
    });

    const wrapper = mount(TemporarySignIn);
    await fillAndSubmit(wrapper, 'parent1', 'correct-password');
    await flushPromises();

    await wrapper.get('[data-testid="signin-signout"]').trigger('click');

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="signin-success"]').exists()).toBe(false);
    expect((wrapper.get('#signin-username').element as HTMLInputElement).value).toBe('');
  });

  it('disables the submit button while submitting', async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    signInMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    const wrapper = mount(TemporarySignIn);
    await wrapper.get('#signin-username').setValue('parent1');
    await wrapper.get('#signin-password').setValue('correct-password');
    await wrapper.get('form').trigger('submit');

    const submitButton = wrapper.get('[data-testid="signin-submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();

    resolveSignIn({ kind: 'error', message: 'Incorrect username or password.', recoverable: true });
    await flushPromises();
  });

  it('shows a graceful retryable error rather than crashing when auth config is missing', async () => {
    loadAuthConfigMock.mockImplementation(() => {
      throw new Error('Missing required Cognito configuration: VITE_COGNITO_USER_POOL_ID');
    });

    const wrapper = mount(TemporarySignIn);
    await fillAndSubmit(wrapper, 'parent1', 'correct-password');
    await flushPromises();

    const error = wrapper.get('[data-testid="signin-error"]');
    expect(error.text()).toBe('Something went wrong. Please try again.');
    expect(error.text()).not.toContain('VITE_COGNITO_USER_POOL_ID');
    expect(wrapper.get('[data-testid="signin-retry"]').exists()).toBe(true);
    expect(signInMock).not.toHaveBeenCalled();
  });
});
