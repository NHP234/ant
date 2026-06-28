import api from './axios'
import type { PageResponse } from './books'
import type { BorrowRecord } from './borrows'

export interface BorrowSlipItemRequest {
  bookId: number
  copyId?: number
}

export interface BorrowSlipCreateRequest {
  username?: string
  studentId?: string
  source?: 'COUNTER' | 'NFC'
  items: BorrowSlipItemRequest[]
}

export interface BorrowSlip {
  id: number
  userId: number
  userFullName: string
  librarianName: string | null
  borrowDate: string
  dueDate: string
  note: string | null
  source: 'COUNTER' | 'NFC'
  records: BorrowRecord[]
  createdAt: string
}

export const borrowSlipApi = {
  create: (data: BorrowSlipCreateRequest) =>
    api.post<{ data: BorrowSlip }>('/borrow-slips', data),

  getMySlips: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<BorrowSlip> }>('/borrow-slips/my', { params: { page, size } }),

  getAll: (page = 0, size = 10, search?: string) =>
    api.get<{ data: PageResponse<BorrowSlip> }>('/borrow-slips', { params: { page, size, search } }),

  getById: (id: number) =>
    api.get<{ data: BorrowSlip }>(`/borrow-slips/${id}`),
}
