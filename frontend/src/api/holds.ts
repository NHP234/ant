import api from './axios'
import type { PageResponse } from './books'

export interface Hold {
  id: number
  userId: number
  userFullName: string
  bookId: number
  bookTitle: string
  copyId: number | null
  copyNumber: number | null
  status: 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELED'
  reservedAt: string
  expiresAt: string
  fulfilledAt: string | null
  canceledAt: string | null
  cancelReason: string | null
  librarianName: string | null
  createdAt: string
}

export interface HoldCreateRequest {
  bookId: number
}

export interface HoldConfirmRequest {
  copyId?: number
}

export interface HoldCancelRequest {
  reason?: string
}

export const holdApi = {
  create: (data: HoldCreateRequest) =>
    api.post<{ data: Hold }>('/holds', data),

  getMyHolds: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Hold> }>('/holds/my', { params: { page, size } }),

  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Hold> }>('/holds', { params: { page, size } }),

  getById: (id: number) =>
    api.get<{ data: Hold }>(`/holds/${id}`),

  confirm: (id: number, data?: HoldConfirmRequest) =>
    api.put<{ data: Hold }>(`/holds/${id}/confirm`, data ?? {}),

  cancel: (id: number, data?: HoldCancelRequest) =>
    api.put<{ data: Hold }>(`/holds/${id}/cancel`, data ?? {}),
}
