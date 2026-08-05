import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import App from '../../App.vue';
import * as apiClient from '../../services/apiClient';

describe('App', () => {
  it('shows a loading state, then success once the service responds', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValue({
      kind: 'success',
      data: { status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' },
    });

    const wrapper = mount(App);

    expect(wrapper.get('[data-testid="status-loading"]').text()).toContain('Checking');

    await flushPromises();

    expect(wrapper.find('[data-testid="status-loading"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="status-success"]').text()).toContain('available');
  });

  it('shows a recoverable error state with a retry control', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValue({
      kind: 'error',
      message: 'Could not reach the server. Check your connection and try again.',
      recoverable: true,
    });

    const wrapper = mount(App);
    await flushPromises();

    const errorRegion = wrapper.get('[data-testid="status-error"]');
    expect(errorRegion.text()).toContain('Could not reach the server');
    expect(errorRegion.get('button').text()).toBe('Retry');
  });

  it('has one h1 and a skip link that targets main content', () => {
    const wrapper = mount(App);
    expect(wrapper.findAll('h1')).toHaveLength(1);
    const skipLink = wrapper.get('a.skip-link');
    expect(skipLink.attributes('href')).toBe('#main-content');
    expect(wrapper.get('#main-content').exists()).toBe(true);
  });
});
