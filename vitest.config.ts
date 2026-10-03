import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['packages/brain/tests/**/*.test.{ts,tsx}', 'apps/demo/tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    testTimeout: 10000,
  },
})
