import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN } from '../fixtures/test-data'
import { apiCreateBook, apiLogin } from '../helpers/api'

function uniqueIsbn(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 20)
}

async function loginAsAdmin(page: Page, request: APIRequestContext) {
  const token = await apiLogin(request, ADMIN.username, ADMIN.password)
  await page.goto('/')
  await page.evaluate((accessToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'ADMIN' }))
  }, token)
}

test.describe('Book Management (Admin)', () => {
  test('create a new book with copies', async ({ page, request }) => {
    await loginAsAdmin(page, request)

    await page.goto('/admin/books')
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: 'Thêm sách' }).click()
    await page.waitForTimeout(500)

    const title = `E2E Playwright Book ${Date.now()}`
    await page.fill('#title', title)
    await page.fill('#author', 'E2E Playwright Author')
    await page.fill('#isbn', uniqueIsbn('E2E-PLY'))
    await page.fill('#quantity', '3')

    const [createResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/books') && response.request().method() === 'POST',
      ),
      page.locator('[role="dialog"] form button').last().click(),
    ])
    expect(createResponse.status()).toBe(201)

    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 })
    await page.getByTestId('book-management-search').fill(title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('view and add a book copy', async ({ page, request }) => {
    const adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)
    const title = `E2E Copy Dialog Book ${Date.now()}`
    await apiCreateBook(request, adminToken, {
      title,
      author: 'E2E Copy Dialog Author',
      isbn: uniqueIsbn('E2E-CPY'),
      quantity: 1,
    })

    await loginAsAdmin(page, request)
    await page.goto('/admin/books')
    await page.waitForTimeout(1000)
    await page.getByTestId('book-management-search').fill(title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })

    const row = page.getByRole('row').filter({ hasText: title })
    await row.getByRole('button', { name: 'Bản sao' }).click()
    await page.waitForTimeout(500)

    await expect(page.getByRole('heading', { name: 'Quản lý bản sao' })).toBeVisible()

    const addBtn = page.getByRole('button', { name: 'Thêm bản sao' })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('delete a book', async ({ page, request }) => {
    const adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)
    const title = `E2E Delete Book ${Date.now()}`
    const bookRes = await apiCreateBook(request, adminToken, {
      title,
      author: 'E2E Delete Author',
      isbn: uniqueIsbn('E2E-DEL'),
      quantity: 1,
    })

    await loginAsAdmin(page, request)
    await page.goto('/admin/books')
    await page.waitForTimeout(1000)
    await page.getByTestId('book-management-search').fill(title)
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })

    const deleteBtn = page.getByTestId(`delete-book-${bookRes.data.id}`)
    if (await deleteBtn.isVisible()) {
      page.on('dialog', (dialog) => dialog.accept())
      await deleteBtn.click()
      await page.waitForTimeout(2000)
    }
  })
})
