import { expect, test, type Page } from '@playwright/test'

const student = {
  id: 7001,
  username: 'batch_student',
  email: 'batch_student@test.local',
  fullName: 'Batch Test Student',
  studentId: 'BATCH001',
  role: 'STUDENT',
  isActive: true,
  createdAt: '2026-06-11T00:00:00',
}

const books = [
  {
    id: 7101,
    title: 'Batch Borrow First Book',
    author: 'First Author',
    isbn: 'BATCH-001',
    publisher: '',
    publishYear: 2026,
    description: '',
    totalCopies: 1,
    availableCopies: 1,
    coverImageUrl: '',
    categories: [],
    createdAt: '2026-06-11T00:00:00',
    updatedAt: '2026-06-11T00:00:00',
  },
  {
    id: 7102,
    title: 'Batch Borrow Second Book',
    author: 'Second Author',
    isbn: 'BATCH-002',
    publisher: '',
    publishYear: 2026,
    description: '',
    totalCopies: 1,
    availableCopies: 1,
    coverImageUrl: '',
    categories: [],
    createdAt: '2026-06-11T00:00:00',
    updatedAt: '2026-06-11T00:00:00',
  },
]

async function installAdminSession(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    localStorage.setItem('access_token', 'e2e-mocked-access-token')
    localStorage.setItem('refresh_token', 'e2e-mocked-refresh-token')
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'ADMIN' }))
  })
}

async function mockBorrowManagementApi(
  page: Page,
  onCreate: (payload: unknown) => { status: number; body: unknown },
) {
  await page.route('http://127.0.0.1:8080/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === 'POST' && url.pathname === '/api/borrow-slips') {
      const result = onCreate(request.postDataJSON())
      await route.fulfill({
        status: result.status,
        contentType: 'application/json',
        body: JSON.stringify(result.body),
      })
      return
    }

    if (url.pathname === '/api/borrow-slips') {
      await route.fulfill({ json: pageResponse([]) })
      return
    }

    if (url.pathname === '/api/users') {
      await route.fulfill({ json: pageResponse([student]) })
      return
    }

    if (url.pathname === '/api/books/search') {
      await route.fulfill({ json: pageResponse(books) })
      return
    }

    const copyMatch = url.pathname.match(/^\/api\/books\/(\d+)\/copies$/)
    if (copyMatch) {
      const bookId = Number(copyMatch[1])
      await route.fulfill({
        json: {
          success: true,
          data: [{
            id: bookId + 100,
            bookId,
            copyNumber: 1,
            nfcTagUid: null,
            status: 'AVAILABLE',
            conditionNote: null,
            createdAt: '2026-06-11T00:00:00',
          }],
        },
      })
      return
    }

    if (url.pathname === '/api/notifications/unread-count') {
      await route.fulfill({ json: { success: true, data: { unreadCount: 0 } } })
      return
    }

    await route.fulfill({ status: 404, json: { message: `Unhandled mock: ${url.pathname}` } })
  })
}

function pageResponse(content: unknown[]) {
  return {
    success: true,
    data: {
      content,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      size: 200,
      page: 0,
      last: true,
    },
  }
}

async function addBookToSlip(page: Page, bookId: number, search: string) {
  await page.getByTestId('direct-borrow-book-search').fill(search)
  await page.getByTestId(`direct-borrow-book-option-${bookId}`).click()
  await page.getByTestId('direct-borrow-add-item').click()
  await expect(page.getByTestId(`direct-borrow-pending-${bookId}`)).toBeVisible()
}

test('counter form submits multiple books in one borrow-slip request', async ({ page }) => {
  let submittedPayload: unknown
  await installAdminSession(page)
  await mockBorrowManagementApi(page, (payload) => {
    submittedPayload = payload
    return {
      status: 201,
      body: {
        success: true,
        data: {
          id: 9001,
          userId: student.id,
          userFullName: student.fullName,
          librarianName: 'Administrator',
          borrowDate: '2026-06-11T00:00:00',
          dueDate: '2026-06-25T00:00:00',
          note: null,
          source: 'COUNTER',
          records: [],
          createdAt: '2026-06-11T00:00:00',
        },
      },
    }
  })

  await page.goto('/admin/borrows')
  await page.getByTestId('direct-borrow-identifier').fill(student.studentId)
  await addBookToSlip(page, books[0].id, books[0].title)
  await addBookToSlip(page, books[1].id, books[1].title)
  await page.getByTestId('direct-borrow-submit').click()

  await expect(page.getByText(/2 cuốn/)).toBeVisible()
  expect(submittedPayload).toEqual({
    studentId: student.studentId,
    source: 'COUNTER',
    items: [
      { bookId: books[0].id },
      { bookId: books[1].id },
    ],
  })
})

test('counter form keeps pending books when the batch request fails', async ({ page }) => {
  await installAdminSession(page)
  await mockBorrowManagementApi(page, () => ({
    status: 400,
    body: {
      success: false,
      error: 'BOOK_NOT_AVAILABLE',
      message: 'One requested book is not available',
    },
  }))

  await page.goto('/admin/borrows')
  await page.getByTestId('direct-borrow-identifier').fill(student.studentId)
  await addBookToSlip(page, books[0].id, books[0].title)
  await page.getByTestId('direct-borrow-submit').click()

  await expect(page.getByTestId('direct-borrow-error')).toContainText('One requested book is not available')
  await expect(page.getByTestId(`direct-borrow-pending-${books[0].id}`)).toBeVisible()
})
