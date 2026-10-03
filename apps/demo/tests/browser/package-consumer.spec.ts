import { expect, test } from '@playwright/test'
test('Next client boundary imports packaged React/core/CSS output', async ({ page }) => {
  await page.goto('/package-proof')
  await expect(page.getByRole('heading', { name: 'Packaged Next.js boundary proof' })).toBeVisible()
  await expect(page.locator('.brain-explorer')).toHaveAttribute('data-ready', 'true')
  await page.getByLabel('Renderer', { exact: true }).selectOption('list')
  await page.getByRole('button', { name: /^Packaged Next consumer document/ }).click()
  await expect(page.getByRole('heading', { name: 'Packaged Next consumer', exact: true })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})
