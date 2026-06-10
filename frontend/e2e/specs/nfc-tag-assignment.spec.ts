import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, API_BASE } from '../fixtures/test-data'

const book = {
  id: 900001,
  title: 'NFC Assignment Test Book',
  author: 'NFC Test Author',
  isbn: 'NFC-TEST-001',
  publisher: '',
  publishYear: 2026,
  description: '',
  totalCopies: 1,
  availableCopies: 1,
  coverImageUrl: '',
  categories: [],
  createdAt: '2026-06-10T00:00:00',
  updatedAt: '2026-06-10T00:00:00',
}

const copy = {
  id: 900002,
  bookId: book.id,
  copyNumber: 1,
  nfcTagUid: null,
  status: 'AVAILABLE',
  conditionNote: null,
  createdAt: '2026-06-10T00:00:00',
}

async function createAdminSession(request: APIRequestContext) {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: ADMIN,
  })
  const body = await response.json()
  return {
    accessToken: body.data.accessToken as string,
    refreshToken: body.data.refreshToken as string,
    user: {
      username: ADMIN.username,
      role: 'ADMIN',
    },
  }
}

async function installFakeEventSource(page: Page) {
  await page.addInitScript(() => {
    type Listener = (event: MessageEvent<string>) => void

    class FakeEventSource {
      static active: FakeEventSource | null = null
      onopen: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      private listeners = new Map<string, Listener[]>()

      constructor() {
        FakeEventSource.active = this
        setTimeout(() => this.onopen?.(new Event('open')), 0)
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        const callback = listener as Listener
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), callback])
      }

      close() {
        if (FakeEventSource.active === this) {
          FakeEventSource.active = null
        }
      }

      emit(type: string, payload: unknown) {
        const event = new MessageEvent(type, { data: JSON.stringify(payload) })
        this.listeners.get(type)?.forEach((listener) => listener(event))
      }
    }

    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      value: FakeEventSource,
    })

    Object.defineProperty(window, '__emitNfcScan', {
      configurable: true,
      value: (payload: unknown) => FakeEventSource.active?.emit('nfc-scan', payload),
    })
  })
}

test('staff can scan and assign an unregistered NFC tag to a book copy', async ({ page, request }) => {
  const scannedUid = 'AA:BB:CC:DD'
  let registrationPayload: { copyId: number; nfcTagUid: string } | undefined
  const session = await createAdminSession(request)

  await page.setViewportSize({ width: 600, height: 800 })
  await installFakeEventSource(page)
  await page.addInitScript((payload) => {
    localStorage.setItem('access_token', payload.accessToken)
    localStorage.setItem('refresh_token', payload.refreshToken)
    localStorage.setItem('user', JSON.stringify(payload.user))
  }, session)

  await page.route('**/api/books?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          content: [book],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          page: 0,
          last: true,
        },
      }),
    })
  })

  await page.route(`**/api/books/${book.id}/copies`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [copy] }),
    })
  })

  await page.route('**/api/nfc/register-book-copy', async (route) => {
    registrationPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...copy,
          nfcTagUid: scannedUid,
        },
      }),
    })
  })

  await page.goto('/admin/books')
  const bookRow = page.getByRole('row').filter({ hasText: book.title })
  await bookRow.getByRole('button', { name: 'Bản sao' }).click()
  await page.getByTestId(`assign-nfc-copy-${copy.id}`).click()

  await expect(page.getByTestId('nfc-scanner-panel')).toContainText('Đang chờ quét')
  await page.evaluate((payload) => {
    const emit = (window as typeof window & { __emitNfcScan: (data: unknown) => void }).__emitNfcScan
    emit(payload)
  }, {
    type: 'UNKNOWN',
    data: { uid: scannedUid },
  })

  await expect(page.getByTestId('nfc-scanner-panel')).toContainText(scannedUid)
  const dialogBox = await page.locator('[data-slot="dialog-content"]').boundingBox()
  const scannerBox = await page.getByTestId('nfc-scanner-panel').boundingBox()
  expect(dialogBox).not.toBeNull()
  expect(scannerBox).not.toBeNull()
  expect(scannerBox!.x + scannerBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1)

  await page.getByTestId('confirm-nfc-tag').click()
  await expect(page.getByText('Đã gán tag NFC cho bản sao')).toBeVisible()
  expect(registrationPayload).toEqual({
    copyId: copy.id,
    nfcTagUid: scannedUid,
  })
})
