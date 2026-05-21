import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
