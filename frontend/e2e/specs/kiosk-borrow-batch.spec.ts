import { expect, test, type Page } from '@playwright/test'

async function installKioskSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'e2e-mocked-access-token')
    localStorage.setItem('refresh_token', 'e2e-mocked-refresh-token')
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'ADMIN' }))

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
        if (type === 'nfc-scan') {
          Object.defineProperty(window, '__nfcListenerReady', {
            configurable: true,
            value: true,
          })
        }
      }

      close() {
        if (FakeEventSource.active === this) FakeEventSource.active = null
      }

      emit(type: string, payload: unknown) {
        const event = new MessageEvent(type, { data: JSON.stringify(payload) })
        this.listeners.get(type)?.forEach(listener => listener(event))
      }
    }

    Object.defineProperty(window, 'EventSource', { configurable: true, value: FakeEventSource })
    Object.defineProperty(window, '__emitNfcScan', {
      configurable: true,
      value: (payload: unknown) => FakeEventSource.active?.emit('nfc-scan', payload),
    })
  })
}

async function emitNfc(page: Page, payload: unknown) {
  await expect.poll(() => page.evaluate(
    () => Boolean((window as typeof window & { __nfcListenerReady?: boolean }).__nfcListenerReady),
  )).toBe(true)

  await page.evaluate((data) => {
    const emit = (window as typeof window & { __emitNfcScan: (value: unknown) => void }).__emitNfcScan
    emit(data)
  }, payload)
}

test('kiosk submits all scanned books in one NFC borrow-slip request', async ({ page }) => {
  let submittedPayload: unknown
  await installKioskSession(page)
  await page.route('**/api/borrow-slips', async (route) => {
    submittedPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          id: 9200,
          source: 'NFC',
          records: [],
        },
      },
    })
  })

  await page.goto('/kiosk')
  await emitNfc(page, {
    type: 'USER',
    data: {
      id: 8001,
      username: 'kiosk_student',
      fullName: 'Kiosk Student',
      studentId: 'KIOSK001',
      role: 'STUDENT',
    },
  })
  await expect(page.getByText('Kiosk Student')).toBeVisible()
  await page.getByTestId('kiosk-select-borrow').click()

  await emitNfc(page, {
    type: 'BOOK_COPY',
    data: {
      id: 8101,
      bookId: 8201,
      copyNumber: 1,
      nfcTagUid: 'AA:BB:CC:01',
      status: 'AVAILABLE',
      title: 'Kiosk First Book',
    },
  })
  await expect(page.getByText('Kiosk First Book')).toBeVisible()
  await emitNfc(page, {
    type: 'BOOK_COPY',
    data: {
      id: 8102,
      bookId: 8202,
      copyNumber: 1,
      nfcTagUid: 'AA:BB:CC:02',
      status: 'AVAILABLE',
      title: 'Kiosk Second Book',
    },
  })
  await expect(page.getByText('Kiosk Second Book')).toBeVisible()
  await page.getByRole('button', { name: /2 sách/ }).click()

  await expect(page.getByText(/Thành công/)).toBeVisible()
  expect(submittedPayload).toEqual({
    studentId: 'KIOSK001',
    source: 'NFC',
    items: [
      { bookId: 8201, copyId: 8101 },
      { bookId: 8202, copyId: 8102 },
    ],
  })
})
