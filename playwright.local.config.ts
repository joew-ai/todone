import { defineConfig, devices } from '@playwright/test';

/** Real local-emulator smoke, separate from HTTP-mocked browser and production checks. */
export default defineConfig({
  testDir: './tests/local-e2e',
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3001', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'chromium-local', use: { ...devices['Desktop Chrome'] } }],
});
