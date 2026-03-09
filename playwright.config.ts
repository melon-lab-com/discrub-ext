import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    trace: 'on-first-retry',
    video: {
      mode: 'on',
      size: { width: 1280, height: 800 }
    },
    screenshot: 'on'
  },
});
