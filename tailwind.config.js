/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--td-bark) / <alpha-value>)',
        muted: 'rgb(var(--td-muted-bark) / <alpha-value>)',
        secondary: 'rgb(var(--td-secondary-bark) / <alpha-value>)',
        line: 'rgb(var(--td-border) / <alpha-value>)',
        paper: 'rgb(var(--td-paper) / <alpha-value>)',
        canvas: 'rgb(var(--td-canvas) / <alpha-value>)',
        action: 'rgb(var(--td-forest) / <alpha-value>)',
        'action-deep': 'rgb(var(--td-forest-deep) / <alpha-value>)',
        'action-soft': 'rgb(var(--td-forest-soft) / <alpha-value>)',
        danger: 'rgb(var(--td-danger) / <alpha-value>)',
        success: 'rgb(var(--td-success) / <alpha-value>)',
        profile: {
          light: 'rgb(var(--td-profile-light) / <alpha-value>)',
          mid: 'rgb(var(--td-profile-mid) / <alpha-value>)',
          deep: 'rgb(var(--td-profile-deep) / <alpha-value>)',
          muted: 'rgb(var(--td-profile-muted) / <alpha-value>)',
          on: 'rgb(var(--td-profile-on-color) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        control: 'var(--td-radius-control)',
        surface: 'var(--td-radius-surface)',
      },
      boxShadow: {
        surface: 'var(--td-shadow-surface)',
      },
    },
  },
  plugins: [],
};
