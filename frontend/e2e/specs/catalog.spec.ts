import { test, expect } from '@playwright/test'
import { STUDENT } from '../fixtures/test-data'
import { apiRegister, apiGetBooks } from '../helpers/api'

test.describe('Catalog & Book Detail', () => {
  test.beforeAll(async ({ request }) => {
    await apiRegister(request, STUDENT)
  })

  test('browse shows book grid', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/browse/)

    await page.goto('/browse')
    await page.waitForTimeout(2000)

    const cards = page.locator('a[href^="/books/"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('book detail shows correct info', async ({ page, request }) => {
    const booksRes = await apiGetBooks(request)
    const book = booksRes.data.content[0]

    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/browse/)

    await page.goto(`/books/${book.id}`)
    await page.waitForTimeout(1000)

    await expect(page.getByText(book.title)).toBeVisible()
    await expect(page.getByText(book.author)).toBeVisible()
    await expect(page.getByText(/Còn/)).toBeVisible()
  })

  test('hold a book from detail page', async ({ page, request }) => {
    const booksRes = await apiGetBooks(request)
    const book = booksRes.data.content.find((b: any) => b.availableCopies > 0)
    if (!book) return

    await page.goto('/login')
    await page.fill('input[name="username"]', STUDENT.username)
    await page.fill('input[name="password"]', STUDENT.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/browse/)

    await page.goto(`/books/${book.id}`)
    await page.waitForTimeout(1000)

    await page.click('button:has-text("Đặt mượn")')
    await page.waitForTimeout(2000)

    await expect(page).toHaveURL(/\/my-borrows/, { timeout: 10000 })
    await expect(page.getByText(book.title)).toBeVisible()
  })
})
