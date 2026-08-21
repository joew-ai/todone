import { defineConfig, devices } from '@playwright/test';

/**
 * Production foundation smoke test ONLY. Deliberately separate from
 * playwright.config.ts: no local webServer, no local baseURL, and never
 * run as part of `npm run test:e2e`/`test:a11y`. See
 * docs/operations/deployment-rollback.md "Foundation smoke test" -- this
 * requires PRODUCTION_URL and explicit human authorization to run.
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PRODUCTION_URL,
    // Deliberately off: Playwright's trace/screenshot/snapshot artifacts
    // capture literal form-field values (including password inputs)
    // regardless of `type="password"` masking. Never risk that for a
    // real Cognito credential -- diagnose failures from the assertion
    // message only.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
