import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../App.vue';

describe('App', () => {
  it('has one h1, a skip link, and the production bootstrap surface', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          ProductionBootstrap: { template: '<section data-testid="production-bootstrap" />' },
        },
      },
    });
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.get('a.skip-link').attributes('href')).toBe('#main-content');
    expect(wrapper.get('#main-content').exists()).toBe(true);
    expect(wrapper.get('[data-testid="production-bootstrap"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Temporary sign-in');
  });
});
