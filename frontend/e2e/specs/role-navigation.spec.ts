import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API_BASE } from '../fixtures/test-data'
import { apiCreateBook, apiCreateUser, apiLogin } from '../helpers/api'

interface TestUser {
  username: string
  password: string
  email: string
  fullName: string
  studentId?: string
  role: 'ADMIN' | 'LIBRARIAN' | 'STUDENT'
}

function uniqueIsbn(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 20)
}

async function createLoginSession(request: APIRequestContext, user: TestUser | typeof ADMIN, role: TestUser['role']) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username: user.username, password: user.password },
  })
  const body = await res.json()
  return {
    accessToken: body.data.accessToken as string,
    refreshToken: body.data.refreshToken as string,
    user: {
      username: user.username,
      role,
    },
  }
}

async function loginWithSession(page: Page, session: Awaited<ReturnType<typeof createLoginSession>>) {
  await page.addInitScript((payload) => {
    window.localStorage.setItem('access_token', payload.accessToken)
    window.localStorage.setItem('refresh_token', payload.refreshToken)
    window.localStorage.setItem('user', JSON.stringify(payload.user))
  }, session)
}

test.describe('Role based staff navigation', () => {
  const suffix = Date.now()
  let adminSession: Awaited<ReturnType<typeof createLoginSession>>
  let librarianSession: Awaited<ReturnType<typeof createLoginSession>>
  let studentSession: Awaited<ReturnType<typeof createLoginSession>>
  let testBookId: number

  test.beforeAll(async ({ request }) => {
    const adminToken = await apiLogin(request, ADMIN.username, ADMIN.password)

    const librarian: TestUser = {
      username: `e2e_role_librarian_${suffix}`,
      password: 'Test@123456',
      email: `e2e_role_librarian_${suffix}@test.local`,
      fullName: 'E2E Role Test Librarian',
      role: 'LIBRARIAN',
    }
    const student: TestUser = {
      username: `e2e_role_student_${suffix}`,
      password: 'Test@123456',
      email: `e2e_role_student_${suffix}@test.local`,
      fullName: 'E2E Role Test Student',
      studentId: `E2EROLE${suffix}`,
      role: 'STUDENT',
    }

    await apiCreateUser(request, adminToken, librarian)
    await apiCreateUser(request, adminToken, student)

    const bookRes = await apiCreateBook(request, adminToken, {
      title: `E2E Role Navigation Book ${suffix}`,
      author: 'E2E Role Navigation Author',
      isbn: uniqueIsbn('E2E-ROL'),
      quantity: 1,
    })
    testBookId = bookRes.data.id

    adminSession = await createLoginSession(request, ADMIN, 'ADMIN')
    librarianSession = await createLoginSession(request, librarian, 'LIBRARIAN')
    studentSession = await createLoginSession(request, student, 'STUDENT')
  })

  test('admin lands in admin workspace and sees admin-only navigation', async ({ page }) => {
    await loginWithSession(page, adminSession)
    await page.goto('/')

    await expect(page).toHaveURL(/\/admin\/dashboard/)
    await expect(page.getByTestId('staff-nav-admin-users')).toBeVisible()
    await expect(page.getByTestId('staff-nav-admin-categories')).toBeVisible()
    await expect(page.getByTestId('staff-nav-admin-audit-logs')).toBeVisible()
  })

  test('librarian lands in librarian workspace without admin-only navigation', async ({ page }) => {
    await loginWithSession(page, librarianSession)
    await page.goto('/')

    await expect(page).toHaveURL(/\/librarian\/dashboard/)
    await expect(page.getByTestId('staff-nav-librarian-books')).toBeVisible()
    await expect(page.getByTestId('staff-nav-admin-users')).toHaveCount(0)
    await expect(page.getByTestId('staff-nav-admin-categories')).toHaveCount(0)
    await expect(page.getByTestId('staff-nav-admin-audit-logs')).toHaveCount(0)
  })

  test('librarian cannot open admin-only routes directly', async ({ page }) => {
    await loginWithSession(page, librarianSession)
    await page.goto('/admin/users')

    await expect(page).toHaveURL(/\/librarian\/dashboard/)
  })

  test('librarian does not see book delete action', async ({ page }) => {
    await loginWithSession(page, librarianSession)
    await page.goto('/librarian/books')
    await page.getByTestId('book-management-search').fill(`E2E Role Navigation Book ${suffix}`)
    await expect(page.getByTestId(`delete-book-${testBookId}`)).toHaveCount(0)
  })

  test('admin sees book delete action', async ({ page }) => {
    await loginWithSession(page, adminSession)
    await page.goto('/admin/books')
    await page.getByTestId('book-management-search').fill(`E2E Role Navigation Book ${suffix}`)
    await expect(page.getByTestId(`delete-book-${testBookId}`)).toBeVisible()
  })

  test('student keeps student workspace and cannot open staff routes', async ({ page }) => {
    await loginWithSession(page, studentSession)
    await page.goto('/')
    await expect(page).toHaveURL(/\/browse/)

    await page.goto('/librarian/dashboard')
    await expect(page).toHaveURL(/\/browse/)
  })

  test('staff sees catalog as read-only without student personal navigation', async ({ page }) => {
    await loginWithSession(page, librarianSession)
    await page.goto('/browse')

    await expect(page).toHaveURL(/\/browse/)
    await expect(page.locator('a[href="/browse"]')).toBeVisible()
    await expect(page.locator('a[href="/my-borrows"]')).toHaveCount(0)
    await expect(page.locator('a[href="/notifications"]')).toHaveCount(0)
    await expect(page.locator('a[href="/chat"]')).toHaveCount(0)
    await expect(page.getByTestId('staff-catalog-readonly-note')).toBeVisible()
  })

  test('staff cannot place holds from book detail', async ({ page }) => {
    await loginWithSession(page, adminSession)
    await page.goto(`/books/${testBookId}`)

    await expect(page.getByTestId('book-hold-button')).toHaveCount(0)
    await expect(page.getByTestId('book-hold-staff-readonly')).toBeVisible()
  })

  test('staff is redirected away from student-only routes', async ({ page }) => {
    await loginWithSession(page, librarianSession)

    await page.goto('/my-borrows')
    await expect(page).toHaveURL(/\/librarian\/dashboard/)

    await page.goto('/notifications')
    await expect(page).toHaveURL(/\/librarian\/dashboard/)

    await page.goto('/chat')
    await expect(page).toHaveURL(/\/librarian\/dashboard/)
  })
})
