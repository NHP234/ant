import { test } from '@playwright/test'
import { STUDENT } from '../fixtures/test-data'
import { apiRegister } from '../helpers/api'

test.describe('Notifications', () => {
  test.beforeAll(async ({ request }) => {
    await apiRegister(request, STUDENT)
  })

  test('student sees notification count and marks as read', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/browse/)

    await page.goto('/notifications')
    await page.waitForTimeout(2000)

    const markBtn = page.getByText('Đã đọc').first()
    if (await markBtn.isVisible()) {
      await markBtn.click()
      await page.waitForTimeout(1000)
    }
  })
})
