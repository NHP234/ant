import { test, expect } from '@playwright/test'
import { STUDENT, TEST_BOOK, ADMIN } from '../fixtures/test-data'
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
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/dashboard/)

    await expect(page.getByText('Holds đang chờ')).toBeVisible()
    await expect(page.getByText(STUDENT.fullName)).toBeVisible()
  })

  test('admin confirms hold in Hold Management', async ({ page, request }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/holds')
    await page.waitForTimeout(1000)

    await expect(page.getByText(STUDENT.fullName)).toBeVisible()

    await page.click('button:has-text("Xác nhận mượn")')
    await page.waitForTimeout(2000)

    await expect(page.getByText('Đã xác nhận')).toBeVisible()
  })

  test('admin sees borrow slip and returns book', async ({ page, request }) => {
    const holdsRes = await (await request.get(
      `http://localhost:8080/api/holds?size=50`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    )).json()
    const activeHold = holdsRes.data.content.find((h: any) => h.status === 'ACTIVE')
    if (activeHold) {
      await apiConfirmHold(request, adminToken, activeHold.id)
    }

    await page.goto('/login')
    await page.fill('input[name="username"]', ADMIN.username)
    await page.fill('input[name="password"]', ADMIN.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin\/dashboard/)

    await page.goto('/admin/borrows')
    await page.waitForTimeout(2000)

    await expect(page.getByText(STUDENT.fullName)).toBeVisible()

    const expandBtn = page.locator('table button:has(svg.lucide-chevron-right), table svg.lucide-chevron-right').first()
    if (await expandBtn.isVisible()) {
      await expandBtn.click()
      await page.waitForTimeout(500)
    }

    const returnBtn = page.getByText('Xác nhận trả').first()
    if (await returnBtn.isVisible()) {
      await returnBtn.click()
      await page.waitForTimeout(2000)
      await expect(page.getByText('Đã trả')).toBeVisible()
    }
  })
})
