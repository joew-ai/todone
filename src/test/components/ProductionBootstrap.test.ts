import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const restoreSession = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const registerFirstParent = vi.fn();
const confirmRegistration = vi.fn();
const resendConfirmationCode = vi.fn();
const forgotPassword = vi.fn();
const confirmForgotPassword = vi.fn();
const getIdToken = vi.fn();
const fetchCurrentMembership = vi.fn();
const createHousehold = vi.fn();

vi.mock('../../config/authConfig', () => ({
  loadAuthConfig: () => ({ userPoolId: 'pool', clientId: 'client', region: 'us-east-1' }),
}));
vi.mock('../../services/authClient', () => ({
  AuthClient: class {
    restoreSession = restoreSession;
    signIn = signIn;
    signOut = signOut;
    registerFirstParent = registerFirstParent;
    confirmRegistration = confirmRegistration;
    resendConfirmationCode = resendConfirmationCode;
    forgotPassword = forgotPassword;
    confirmForgotPassword = confirmForgotPassword;
    getIdToken = getIdToken;
  },
}));
vi.mock('../../services/householdClient', () => ({ fetchCurrentMembership, createHousehold }));

const { default: ProductionBootstrap } = await import('../../components/ProductionBootstrap.vue');

const membership = {
  memberId: 'member-one',
  role: 'parent',
  household: {
    householdId: 'house-one',
    name: 'River House',
    timezone: 'America/Chicago',
  },
};

describe('ProductionBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreSession.mockResolvedValue(null);
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership: null } });
    getIdToken.mockReturnValue('id-token');
  });

  it('shows restoration without flashing signed-out content, then renders sign in', async () => {
    let finish: (value: null) => void = () => undefined;
    restoreSession.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const wrapper = mount(ProductionBootstrap);
    expect(wrapper.text()).toContain('Restoring your private session');
    expect(wrapper.text()).not.toContain('Create first-parent account');
    finish(null);
    await flushPromises();
    expect(wrapper.get('h2').text()).toBe('Sign in');
  });

  it('restores the same-tab session and gates an unattached account at household creation', async () => {
    restoreSession.mockResolvedValue({ idToken: 'restored-token' });
    const wrapper = mount(ProductionBootstrap);
    await flushPromises();
    expect(fetchCurrentMembership).toHaveBeenCalledWith('restored-token');
    expect(wrapper.get('h2').text()).toBe('Create your household');
  });

  it('registers, clears secret fields, confirms email, and supports resend', async () => {
    registerFirstParent.mockResolvedValue({ kind: 'success' });
    confirmRegistration.mockResolvedValue({ kind: 'success' });
    resendConfirmationCode.mockResolvedValue({ kind: 'success' });
    const wrapper = mount(ProductionBootstrap);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create first-parent'))!
      .trigger('click');
    await wrapper.get('input[autocomplete="username"]').setValue('ParentOne');
    await wrapper.get('input[autocomplete="email"]').setValue('parent@example.invalid');
    await wrapper.get('input[autocomplete="new-password"]').setValue('StrongPassword123!');
    await wrapper.get('input[autocomplete="off"]').setValue('gate-private');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(registerFirstParent).toHaveBeenCalledWith(
      'ParentOne',
      'StrongPassword123!',
      'parent@example.invalid',
      'gate-private',
    );
    expect(wrapper.get('h2').text()).toContain('Verify');
    await wrapper.get('button[type="button"]').trigger('click');
    await flushPromises();
    expect(resendConfirmationCode).toHaveBeenCalledWith('ParentOne');
    await wrapper.get('input[autocomplete="one-time-code"]').setValue('123456');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(confirmRegistration).toHaveBeenCalledWith('ParentOne', '123456');
    expect(wrapper.get('h2').text()).toBe('Sign in');
    expect(wrapper.find('input[autocomplete="off"]').exists()).toBe(false);
  });

  it('renders an accessible duplicate-username field conflict', async () => {
    registerFirstParent.mockResolvedValue({
      kind: 'error',
      field: 'username',
      message: 'That username is already in use.',
      recoverable: true,
    });
    const wrapper = mount(ProductionBootstrap);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create first-parent'))!
      .trigger('click');
    for (const [selector, value] of [
      ['input[autocomplete="username"]', 'ParentOne'],
      ['input[autocomplete="email"]', 'parent@example.invalid'],
      ['input[autocomplete="new-password"]', 'StrongPassword123!'],
      ['input[autocomplete="off"]', 'gate-private'],
    ])
      await wrapper.get(selector).setValue(value);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('input[autocomplete="username"]').attributes('aria-invalid')).toBe('true');
    expect(wrapper.text()).toContain('already in use');
  });

  it('offers generic Forgot Password initiation and completes recovery', async () => {
    forgotPassword.mockResolvedValue({ kind: 'success' });
    confirmForgotPassword.mockResolvedValue({ kind: 'success' });
    const wrapper = mount(ProductionBootstrap);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Forgot'))!
      .trigger('click');
    await wrapper.get('input[autocomplete="username"]').setValue('ParentOne');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('If the account is eligible');
    await wrapper.get('input[autocomplete="one-time-code"]').setValue('123456');
    await wrapper.get('input[autocomplete="new-password"]').setValue('NewStrongPassword123!');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(confirmForgotPassword).toHaveBeenCalledWith(
      'ParentOne',
      '123456',
      'NewStrongPassword123!',
    );
    expect(wrapper.get('h2').text()).toBe('Sign in');
  });

  it('validates household name with focus, then lands on onboarding after creation', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    createHousehold.mockResolvedValue({ kind: 'success', data: { membership } });
    const wrapper = mount(ProductionBootstrap, { attachTo: document.body });
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    const name = wrapper.get('input[maxlength="80"]');
    expect(name.attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(name.element);
    await name.setValue('River House');
    await wrapper.get('select').setValue('America/Chicago');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(createHousehold).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({ name: 'River House', timezone: 'America/Chicago' }),
    );
    expect(wrapper.text()).toContain('Next, add your family members');
    wrapper.unmount();
  });

  it('clears private rendered state on sign-out', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    const wrapper = mount(ProductionBootstrap);
    await flushPromises();
    expect(wrapper.text()).toContain('River House');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sign out')!
      .trigger('click');
    expect(signOut).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('River House');
    expect(wrapper.get('h2').text()).toBe('Sign in');
  });
});
