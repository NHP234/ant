import { expect, test } from '@playwright/test'
import { ADMIN, STUDENT } from '../fixtures/test-data'
import { apiRegister } from '../helpers/api'

test.describe('Authentication', () => {
  test('register new student successfully', async ({ page, request }) => {
    await apiRegister(request, STUDENT)

    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await expect(page).toHaveURL(/\/browse/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Khám phá' })).toBeVisible()
  })

  test('login as admin redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Tổng quan/ })).toBeVisible()
  })

  test('login as student redirects to browse', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await expect(page).toHaveURL(/\/browse/, { timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Khám phá' })).toBeVisible()
  })
})
