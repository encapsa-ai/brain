import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './apps/demo/tests/browser',
  timeout: 45000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '/tmp/brain-playwright-results',
  use: {
    baseURL: process.env.BRAIN_TEST_URL ?? 'http://localhost:3000',
    browserName: 'chromium', viewport: { width: 1440, height: 1000 }, colorScheme: 'dark',
    launchOptions: { args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] },
    trace: 'retain-on-failure',
  },
})
