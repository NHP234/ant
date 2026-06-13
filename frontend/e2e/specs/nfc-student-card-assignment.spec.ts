import { expect, test, type Page } from '@playwright/test'

const student = {
  id: 700001,
  username: 'nfc_student',
  fullName: 'Nguyen Van NFC',
  studentId: 'NFC2026',
  isActive: true,
  nfcCardUid: null,
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

async function emitNfc(page: Page, payload: unknown) {
  await page.evaluate((eventPayload) => {
    const emit = (window as typeof window & {
      __emitNfcScan: (value: unknown) => void
    }).__emitNfcScan
    emit(eventPayload)
  }, payload)
}

test('librarian can scan and assign an unregistered card to a student', async ({ page }) => {
  const scannedUid = '66:3D:F3:06'
  let registrationPayload: { userId: number; nfcCardUid: string } | undefined

  await installFakeEventSource(page)
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'mock-librarian-token')
    localStorage.setItem('refresh_token', 'mock-refresh-token')
    localStorage.setItem('user', JSON.stringify({
      username: 'librarian',
      role: 'LIBRARIAN',
    }))
  })

  await page.route(/\/api\/nfc\/students(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          content: [student],
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          last: true,
        },
      }),
    })
  })

  await page.route('**/api/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: 0 }),
    })
  })

  await page.route('**/api/nfc/register-user', async (route) => {
    registrationPayload = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...student,
          nfcCardUid: scannedUid,
        },
      }),
    })
  })

  await page.goto('/librarian/nfc-cards')
  await expect(page.getByRole('heading', { name: 'Cấp thẻ NFC' })).toBeVisible()
  await expect(page.getByTestId('staff-nav-librarian-nfc-cards')).toBeVisible()
  await expect(page.getByTestId('staff-nav-admin-users')).toHaveCount(0)

  await page.getByTestId(`assign-nfc-student-${student.id}`).click()
  await expect(page.getByTestId('nfc-student-scanner-panel')).toContainText('Đang chờ quét')

  await emitNfc(page, {
    type: 'USER',
    data: { id: 99 },
  })
  await expect(page.getByText('Thẻ này đã được gán cho một sinh viên.')).toBeVisible()

  await emitNfc(page, {
    type: 'UNKNOWN',
    data: { uid: scannedUid },
  })
  await expect(page.getByTestId('nfc-student-scanner-panel')).toContainText(scannedUid)

  await page.getByTestId('confirm-student-nfc-card').click()
  await expect(page.getByText('Đã gán thẻ NFC cho sinh viên')).toBeVisible()
  expect(registrationPayload).toEqual({
    userId: student.id,
    nfcCardUid: scannedUid,
  })
})
