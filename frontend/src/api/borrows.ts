import api from './axios'
import type { PageResponse } from './books'

export interface BorrowRecord {
  id: number
  userId: number
  userFullName: string
  bookId: number
  bookTitle: string
  bookAuthor: string
  borrowDate: string
  dueDate: string
  returnDate: string | null
  status: 'BORROWING' | 'RETURNED' | 'OVERDUE'
  note: string | null
  createdAt: string
}

export const borrowApi = {
  borrow: (bookId: number) =>
    api.post<{ data: BorrowRecord }>('/borrows', { bookId }),

  return: (borrowId: number, note?: string) =>
    api.put<{ data: BorrowRecord }>(`/borrows/${borrowId}/return`, null, {
      params: note ? { note } : undefined,
    }),

  getMyBorrows: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<BorrowRecord> }>('/borrows/my', { params: { page, size } }),

  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<BorrowRecord> }>('/borrows', { params: { page, size } }),

  getOverdue: () =>
    api.get<{ data: BorrowRecord[] }>('/borrows/overdue'),
}
