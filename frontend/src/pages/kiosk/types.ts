import type { BorrowRecord } from '@/api/borrows'

// ─── Kiosk State Machine ───
export type KioskState =
  | 'WAITING_FOR_USER'
  | 'SELECT_MODE'
  | 'SCANNING_BORROW'
  | 'SCANNING_RETURN'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR'

// ─── NFC scan data types ───
export interface KioskUser {
  id: number
  username: string
  fullName: string
  studentId: string
  role: string
}

export interface BookCopyData {
  id: number
  bookId: number
  copyNumber: number
  nfcTagUid: string
  status: string
  title?: string
  coverImageUrl?: string
  conditionNote?: string
}

export interface NfcScanEvent {
  type: string
  data: unknown
}

// ─── Toast ───
export interface KioskToast {
  text: string
  type: 'success' | 'warning' | 'error'
}

// ─── Kiosk state bag ───
export interface KioskStateBag {
  kioskState: KioskState
  currentUser: KioskUser | null
  scannedBorrowCopies: BookCopyData[]
  activeUserBorrows: BorrowRecord[]
  scannedReturnIds: number[]
  sseStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'
  toastMessage: KioskToast | null
  transactionError: string
  countdown: number
}

// ─── Copy status labels for students ───
export function getCopyStatusLabel(status: string): string {
  switch (status) {
    case 'AVAILABLE': return 'Sẵn sàng'
    case 'BORROWED': return 'Đang được mượn'
    case 'RESERVED': return 'Đã đặt trước'
    case 'DAMAGED': return 'Hư hỏng'
    case 'LOST': return 'Thất lạc'
    default: return 'Không khả dụng'
  }
}
