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
const fetchMyProfile = vi.fn();
const saveMyProfile = vi.fn();
const fetchFamilyMembers = vi.fn();

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
vi.mock('../../services/profileClient', () => ({
  fetchMyProfile,
  saveMyProfile,
  ProfileColor: { pine: 'PINE', lake: 'LAKE' },
  ProfileColorHex: { PINE: '#2F6B4F', LAKE: '#337B8C' },
}));
vi.mock('../../services/familyClient', () => ({ fetchFamilyMembers }));

const { default: ProductionBootstrap } = await import('../../components/ProductionBootstrap.vue');
const { router } = await import('../../router');
const { AppRouteName } = await import('../../router/routes');

function mountBootstrap(options: Record<string, unknown> = {}) {
  return mount(ProductionBootstrap, { global: { plugins: [router] }, ...options });
}

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
  beforeEach(async () => {
    vi.clearAllMocks();
    restoreSession.mockResolvedValue(null);
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership: null } });
    fetchMyProfile.mockResolvedValue({ kind: 'success', data: { profile: null } });
    fetchFamilyMembers.mockResolvedValue({ kind: 'success', data: { members: [] } });
    getIdToken.mockReturnValue('id-token');
    await router.push({ name: AppRouteName.signIn });
  });

  it('shows restoration without flashing signed-out content, then renders sign in', async () => {
    let finish: (value: null) => void = () => undefined;
    restoreSession.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const wrapper = mountBootstrap();
    expect(wrapper.text()).toContain('Restoring your private session');
    expect(wrapper.text()).not.toContain('Create first-parent account');
    finish(null);
    await flushPromises();
    expect(wrapper.get('h2').text()).toBe('Sign in');
  });

  it('restores the same-tab session and gates an unattached account at household creation', async () => {
    restoreSession.mockResolvedValue({ idToken: 'restored-token' });
    const wrapper = mountBootstrap();
    await flushPromises();
    expect(fetchCurrentMembership).toHaveBeenCalledWith('restored-token');
    expect(wrapper.get('h2').text()).toBe('Create your household');
  });

  it('registers, clears secret fields, confirms email, and supports resend', async () => {
    registerFirstParent.mockResolvedValue({ kind: 'success' });
    confirmRegistration.mockResolvedValue({ kind: 'success' });
    resendConfirmationCode.mockResolvedValue({ kind: 'success' });
    const wrapper = mountBootstrap();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create first-parent'))!
      .trigger('click');
    await flushPromises();
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
    const wrapper = mountBootstrap();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create first-parent'))!
      .trigger('click');
    await flushPromises();
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

  it('labels the registration gate as Entry Code and blocks weak account passwords', async () => {
    const wrapper = mountBootstrap({ attachTo: document.body });
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Create first-parent'))!
      .trigger('click');
    await flushPromises();
    await wrapper.get('input[autocomplete="username"]').setValue('ParentOne');
    await wrapper.get('input[autocomplete="email"]').setValue('parent@example.invalid');
    await wrapper.get('input[autocomplete="off"]').setValue('gate-private');
    await wrapper.get('input[autocomplete="new-password"]').setValue('weak');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const passwordField = wrapper.get('input[autocomplete="new-password"]');
    expect(wrapper.text()).toContain('Entry Code');
    expect(wrapper.text()).not.toContain('Registration password');
    expect(wrapper.text()).toContain(
      'including an uppercase letter, lowercase letter, number, and symbol',
    );
    expect(passwordField.attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(passwordField.element);
    expect(registerFirstParent).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('offers generic Forgot Password initiation and completes recovery', async () => {
    forgotPassword.mockResolvedValue({ kind: 'success' });
    confirmForgotPassword.mockResolvedValue({ kind: 'success' });
    const wrapper = mountBootstrap();
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Forgot'))!
      .trigger('click');
    await flushPromises();
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

  it('shows the same password policy and focuses the recovery password after weak input', async () => {
    forgotPassword.mockResolvedValue({ kind: 'success' });
    const wrapper = mountBootstrap({ attachTo: document.body });
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Forgot'))!
      .trigger('click');
    await flushPromises();
    await wrapper.get('input[autocomplete="username"]').setValue('ParentOne');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    await wrapper.get('input[autocomplete="one-time-code"]').setValue('123456');
    await wrapper.get('input[autocomplete="new-password"]').setValue('weak');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const passwordField = wrapper.get('input[autocomplete="new-password"]');
    expect(wrapper.text()).toContain(
      'including an uppercase letter, lowercase letter, number, and symbol',
    );
    expect(passwordField.attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(passwordField.element);
    expect(confirmForgotPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('validates household name with focus, then requires profile setup after creation', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    createHousehold.mockResolvedValue({ kind: 'success', data: { membership } });
    const wrapper = mountBootstrap({ attachTo: document.body });
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    const name = wrapper.get('input[maxlength="80"]');
    expect(name.attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(name.element);
    await name.setValue('River House');
    await wrapper.get('select').setValue('America/Chicago');
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(createHousehold).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({ name: 'River House', timezone: 'America/Chicago' }),
    );
    expect(fetchMyProfile).toHaveBeenCalledWith('id-token');
    expect(wrapper.get('h2').text()).toBe('Set up your profile');
    wrapper.unmount();
  });

  it('requires a display name and palette choice, then creates the first profile', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    saveMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'member-one', displayName: 'River', color: 'LAKE', version: 1 },
      },
    });
    const wrapper = mountBootstrap({ attachTo: document.body });
    await flushPromises();
    expect(wrapper.get('h2').text()).toBe('Set up your profile');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    const name = wrapper.get('input[autocomplete="nickname"]');
    expect(name.attributes('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(name.element);
    await name.setValue('River');
    await wrapper.get('input[value="LAKE"]').setValue();
    fetchMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'member-one', displayName: 'River', color: 'LAKE', version: 1 },
      },
    });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(saveMyProfile).toHaveBeenCalledWith('id-token', {
      displayName: 'River',
      color: 'LAKE',
      version: 0,
    });
    expect(wrapper.text()).toContain('Family management');
    wrapper.unmount();
  });

  it('offers an explicit retry when profile loading has a recoverable error', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    fetchMyProfile
      .mockResolvedValueOnce({ kind: 'error', message: 'Offline', recoverable: true })
      .mockResolvedValueOnce({ kind: 'success', data: { profile: null } });
    const wrapper = mountBootstrap();
    await flushPromises();
    expect(wrapper.text()).toContain('We could not load your profile');
    const initialProfileReads = fetchMyProfile.mock.calls.length;
    await wrapper.get('button.primary').trigger('click');
    await flushPromises();
    expect(fetchMyProfile.mock.calls.length).toBeGreaterThan(initialProfileReads);
    expect(wrapper.get('h2').text()).toBe('Set up your profile');
  });

  it('renders the family directory and lets a member edit only their own profile', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    fetchMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'member-one', displayName: 'River', color: 'PINE', version: 1 },
      },
    });
    fetchFamilyMembers.mockResolvedValue({
      kind: 'success',
      data: {
        members: [
          {
            memberId: 'member-one',
            username: 'parent-one',
            role: 'parent',
            activationState: 'ACTIVE',
            displayName: 'River',
            color: 'PINE',
            allowedActions: [],
          },
        ],
      },
    });
    saveMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'member-one', displayName: 'River Two', color: 'LAKE', version: 2 },
      },
    });
    const wrapper = mountBootstrap();
    await flushPromises();
    expect(wrapper.text()).toContain('@parent-one');
    await wrapper.get('button.secondary').trigger('click');
    await flushPromises();
    await wrapper.get('input[autocomplete="nickname"]').setValue('River Two');
    await wrapper.get('input[value="LAKE"]').setValue();
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(saveMyProfile).toHaveBeenCalledWith('id-token', {
      displayName: 'River Two',
      color: 'LAKE',
      version: 1,
    });
    expect(wrapper.text()).toContain('Profile updated.');
  });

  it('clears private rendered state on sign-out', async () => {
    restoreSession.mockResolvedValue({ idToken: 'token' });
    fetchCurrentMembership.mockResolvedValue({ kind: 'success', data: { membership } });
    fetchMyProfile.mockResolvedValue({
      kind: 'success',
      data: {
        profile: { memberId: 'member-one', displayName: 'River', color: 'LAKE', version: 1 },
      },
    });
    fetchFamilyMembers.mockResolvedValue({ kind: 'success', data: { members: [] } });
    const wrapper = mountBootstrap();
    await flushPromises();
    expect(wrapper.text()).toContain('River House');
    restoreSession.mockResolvedValue(null);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Sign out')!
      .trigger('click');
    await flushPromises();
    expect(signOut).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('River House');
    expect(wrapper.get('h2').text()).toBe('Sign in');
  });
});
