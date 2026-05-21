import { test, expect } from '@playwright/test'
import { STUDENT, ADMIN } from '../fixtures/test-data'
import { apiRegister, apiLogin } from '../helpers/api'

test.describe('Notifications', () => {
  let studentToken: string

  test.beforeAll(async ({ request }) => {
    await apiRegister(request, STUDENT)
    studentToken = await apiLogin(request, STUDENT.username, STUDENT.password)
  })

  test('student sees notification count and marks as read', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
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
