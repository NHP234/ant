import api from './axios'
import type { PageResponse } from './books'

export type BorrowStatus = 'BORROWING' | 'RETURNED' | 'OVERDUE'
export type BorrowSource = 'COUNTER' | 'NFC'

export interface BorrowRecord {
  id: number
  userId: number
  userFullName: string
  bookId: number
  bookTitle: string
  bookAuthor: string
  bookCoverImageUrl?: string
  copyId: number
  copyNumber: number
  borrowDate: string
  dueDate: string
  returnDate: string | null
  status: BorrowStatus
  note: string | null
  createdAt: string
}

export interface BorrowRequest {
  bookId: number
  username?: string
  studentId?: string
  copyId?: number
  source?: BorrowSource
}

export const borrowApi = {
  borrow: (data: BorrowRequest) =>
    api.post<{ data: BorrowRecord }>('/borrows', data),

  return: (borrowId: number, note?: string) =>
    api.put<{ data: BorrowRecord }>(`/borrows/${borrowId}/return`, null, {
      params: note ? { note } : undefined,
    }),

  getMyBorrows: (page = 0, size = 10, statuses?: BorrowStatus[]) =>
    api.get<{ data: PageResponse<BorrowRecord> }>('/borrows/my', {
      params: {
        page,
        size,
        ...(statuses?.length ? { statuses: statuses.join(',') } : {}),
      },
    }),

  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<BorrowRecord> }>('/borrows', { params: { page, size } }),

  getOverdue: () =>
    api.get<{ data: BorrowRecord[] }>('/borrows/overdue'),

  getActiveBorrows: (studentId: string) =>
    api.get<{ data: BorrowRecord[] }>('/borrows/active', { params: { studentId } }),
}
