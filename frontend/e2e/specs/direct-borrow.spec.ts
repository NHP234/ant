import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API_BASE } from '../fixtures/test-data'
import { apiCreateBook, apiLogin, apiRegister } from '../helpers/api'

interface BorrowSlipRecord {
  bookTitle: string
  status: string
}

interface BorrowSlip {
  userFullName: string
  source: string
  records: BorrowSlipRecord[]
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="username"]', ADMIN.username)
  await page.fill('input[name="password"]', ADMIN.password)
  await page.keyboard.press('Enter')
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 })
}

async function fetchBorrowSlips(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/borrow-slips?size=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  return res.json() as Promise<{ data: { content: BorrowSlip[] } }>
}

test.describe('Direct counter borrow', () => {
  test('admin creates a COUNTER borrow from Borrow Management', async ({ page, request }) => {
    const suffix = Date.now()
    const student = {
      username: `counter_student_${suffix}`,
      password: 'Test@123456',
      email: `counter_student_${suffix}@test.com`,
      fullName: `Counter Student ${suffix}`,
      studentId: `CB${suffix}`,
    }
    const book = {
      title: `Counter Borrow Book ${suffix}`,
      author: 'Counter Borrow Author',
      isbn: `978-CB-${suffix}`,
      quantity: 2,
    }

    await apiRegister(request, student)
    const adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)
    const bookRes = await apiCreateBook(request, adminToken, book)
    const bookId = bookRes.data.id

    await loginAsAdmin(page)
    await page.goto('/admin/borrows')

    await page.getByTestId('direct-borrow-identifier').fill(student.studentId)
    await page.getByTestId('direct-borrow-book-search').fill(book.title)
    await page.getByTestId(`direct-borrow-book-option-${bookId}`).click()
    await page.getByTestId('direct-borrow-submit').click()

    await expect(page.getByTestId('direct-borrow-error')).toHaveCount(0)

    await expect.poll(async () => {
      const slips = await fetchBorrowSlips(request, adminToken)
      const slip = slips.data.content.find((item) =>
        item.userFullName === student.fullName
        && item.source === 'COUNTER'
        && item.records.some((record) => record.bookTitle === book.title && record.status === 'BORROWING')
      )
      return Boolean(slip)
    }, {
      timeout: 10000,
      message: 'new counter borrow slip should be visible through API',
    }).toBe(true)

    await page.reload()
    await expect(page.getByText(student.fullName).first()).toBeVisible({ timeout: 10000 })
  })

  test('admin sees backend business error when borrowing the same book twice', async ({ page, request }) => {
    const suffix = Date.now()
    const student = {
      username: `counter_duplicate_${suffix}`,
      password: 'Test@123456',
      email: `counter_duplicate_${suffix}@test.com`,
      fullName: `Counter Duplicate ${suffix}`,
      studentId: `CD${suffix}`,
    }
    const book = {
      title: `Duplicate Counter Book ${suffix}`,
      author: 'Counter Borrow Author',
      isbn: `978-CD-${suffix}`,
      quantity: 2,
    }

    await apiRegister(request, student)
    const adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)
    const bookRes = await apiCreateBook(request, adminToken, book)
    const bookId = bookRes.data.id

    await loginAsAdmin(page)
    await page.goto('/admin/borrows')

    await page.getByTestId('direct-borrow-identifier').fill(student.studentId)
    await page.getByTestId('direct-borrow-book-search').fill(book.title)
    await page.getByTestId(`direct-borrow-book-option-${bookId}`).click()
    await page.getByTestId('direct-borrow-submit').click()

    await expect.poll(async () => {
      const slips = await fetchBorrowSlips(request, adminToken)
      return slips.data.content.some((item) =>
        item.userFullName === student.fullName
        && item.records.some((record) => record.bookTitle === book.title)
      )
    }).toBe(true)

    await page.getByTestId('direct-borrow-identifier').fill(student.studentId)
    await page.getByTestId('direct-borrow-book-search').fill(book.title)
    await page.getByTestId(`direct-borrow-book-option-${bookId}`).click()
    await page.getByTestId('direct-borrow-submit').click()

    await expect(page.getByTestId('direct-borrow-error')).toContainText('already borrowing', { timeout: 10000 })
  })
})
