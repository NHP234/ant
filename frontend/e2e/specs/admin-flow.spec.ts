import { test, expect } from '@playwright/test'
import { STUDENT, TEST_BOOK, ADMIN, API_BASE } from '../fixtures/test-data'
import { apiRegister, apiLogin, apiCreateBook, apiCreateHold, apiConfirmHold } from '../helpers/api'

test.describe('Admin Full Flow: Hold → Confirm → Borrow → Return', () => {
  let studentToken: string
  let adminToken: string
  let bookId: number

  test.beforeAll(async ({ request }) => {
    await apiRegister(request, STUDENT)
    studentToken = await apiLogin(request, STUDENT.username, STUDENT.password)
    adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)

    const bookRes = await apiCreateBook(request, adminToken, {
      title: TEST_BOOK.title,
      author: TEST_BOOK.author,
      isbn: TEST_BOOK.isbn,
      quantity: TEST_BOOK.quantity,
    })
    bookId = bookRes.data.id

    await apiCreateHold(request, studentToken, bookId)
  })

  test('admin logs in and sees dashboard holds', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await expect(page.getByText('Holds đang chờ').first()).toBeVisible()
    await expect(page.getByText(STUDENT.fullName).first()).toBeVisible()
  })

  test('admin confirms hold in Hold Management', async ({ page, request }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/holds')
    await page.waitForTimeout(1000)

    await expect(page.getByText(STUDENT.fullName).first()).toBeVisible()

    await page.getByRole('button', { name: 'Xác nhận mượn' }).first().click()
    await page.waitForTimeout(2000)

    await expect(page.getByText('Đã xác nhận').first()).toBeVisible()
  })

  test('admin sees borrow slip and returns book', async ({ page, request }) => {
    const holdsRes = await (await request.get(
      `${API_BASE}/holds?size=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )).json()
    const activeHold = holdsRes.data.content.find((h: any) => h.status === 'ACTIVE')
    if (activeHold) {
      await apiConfirmHold(request, adminToken, activeHold.id)
    }

    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/borrows')
    await page.waitForTimeout(2000)

    await expect(page.getByText(STUDENT.fullName).first()).toBeVisible()

    const expandBtn = page.locator('tr[data-state] svg').first()
    if (await expandBtn.isVisible()) {
      await expandBtn.click()
      await page.waitForTimeout(500)
    }

    const returnBtn = page.getByRole('button', { name: 'Xác nhận trả' }).first()
    if (await returnBtn.isVisible()) {
      await returnBtn.click()
      await page.waitForTimeout(2000)
      await expect(page.getByText('Đã trả', { exact: true }).first()).toBeVisible()
    }
  })
})
