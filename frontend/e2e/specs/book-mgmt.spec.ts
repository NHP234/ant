import { test, expect } from '@playwright/test'
import { ADMIN } from '../fixtures/test-data'

test.describe('Book Management (Admin)', () => {
  test('create a new book with copies', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/books')
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: 'Thêm sách' }).click()
    await page.waitForTimeout(500)

    const title = `Playwright Book ${Date.now()}`
    await page.fill('#title', title)
    await page.fill('#author', 'Playwright Author')
    await page.fill('#isbn', `978-${Date.now()}`)
    await page.fill('#quantity', '3')
    await page.getByRole('button', { name: 'Thêm sách', exact: true }).click()

    await page.waitForTimeout(2000)

    await page.fill('input[placeholder="Tìm kiếm sách..."]', title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('view and delete a book copy', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/books')
    await page.waitForTimeout(1000)

    const copyBtn = page.getByRole('button', { name: 'Bản sao' }).first()
    await copyBtn.click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: 'Quản lý bản sao' })).toBeVisible()

    const addBtn = page.getByRole('button', { name: 'Thêm bản sao' })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('delete a book', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/books')
    await page.waitForTimeout(1000)

    const deleteBtn = page.getByRole('button', { name: 'Xóa' }).last()
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (dialog) => dialog.accept())
      await deleteBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})
