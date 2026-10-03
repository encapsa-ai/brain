import { expect, test } from '@playwright/test'

test('shared connection picker uses keyboard selection and stays inside fullscreen', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.brain-explorer')).toHaveAttribute('data-ready', 'true')
  // Delay only the promise continuation; the browser still enters real fullscreen.
  await page.evaluate(() => {
    const requestFullscreen = Element.prototype.requestFullscreen
    Element.prototype.requestFullscreen = function (this: Element) {
      return requestFullscreen.call(this).then(() => new Promise<void>(resolve => {
        ;(window as Window & { __finishBrainFullscreen?: () => void }).__finishBrainFullscreen = resolve
      }))
    }
  })
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click()
  await page.waitForFunction(() => typeof (window as Window & { __finishBrainFullscreen?: () => void }).__finishBrainFullscreen === 'function')
  const trigger = page.getByRole('button', { name: 'Connections: All items', exact: true })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  const firstOption = page.getByRole('menuitemradio', { name: 'All items', exact: true })
  await expect(firstOption).toBeFocused()
  expect(await page.getByRole('menu').evaluate(element => !!element.closest('.brain-explorer'))).toBe(true)
  await page.evaluate(async () => {
    ;(window as Window & { __finishBrainFullscreen?: () => void }).__finishBrainFullscreen?.()
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  })
  await expect(firstOption).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitemradio', { name: 'Direct connections', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Connections: Direct connections', exact: true })).toBeFocused()
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test('shared inspector discloses and copies the full source field without technical footer or path form', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.locator('.brain-explorer')).toHaveAttribute('data-ready', 'true')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin })
  const field = page.getByRole('button', { name: /^Copy source field:/ }).first()
  await field.focus()
  await expect(page.getByRole('tooltip')).toBeVisible()
  const value = await field.textContent()
  await field.click()
  await expect(page.getByRole('tooltip').getByText('Copied', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(page.locator('.brain-inspector-footer')).not.toContainText('Metadata only')
  await page.getByRole('tab', { name: /Relationships/ }).click()
  await expect(page.locator('.brain-relationship-count')).toBeVisible()
  await expect(page.getByLabel('Directed path to another entity')).toHaveCount(0)
})
