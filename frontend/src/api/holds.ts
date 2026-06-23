import api from './axios'
import type { PageResponse } from './books'
import type { BorrowSource } from './borrows'
import type { BorrowSlip } from './borrowSlips'

export type HoldStatus = 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELED'

export interface Hold {
  id: number
  userId: number
  userFullName: string
  bookId: number
  bookTitle: string
  bookAuthor: string
  bookCoverImageUrl?: string
  copyId: number | null
  copyNumber: number | null
  status: HoldStatus
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
  source?: BorrowSource
}

export interface HoldCancelRequest {
  reason?: string
}

export interface HoldPickupRequest {
  userId?: number
  username?: string
  studentId?: string
  source?: BorrowSource
}

export const holdApi = {
  create: (data: HoldCreateRequest) =>
    api.post<{ data: Hold }>('/holds', data),

  getMyHolds: (page = 0, size = 10, statuses?: HoldStatus[]) =>
    api.get<{ data: PageResponse<Hold> }>('/holds/my', {
      params: {
        page,
        size,
        ...(statuses?.length ? { statuses: statuses.join(',') } : {}),
      },
    }),

  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Hold> }>('/holds', { params: { page, size } }),

  getById: (id: number) =>
    api.get<{ data: Hold }>(`/holds/${id}`),

  confirm: (id: number, data?: HoldConfirmRequest) =>
    api.put<{ data: Hold }>(`/holds/${id}/confirm`, data ?? {}),

  pickup: (data: HoldPickupRequest) =>
    api.post<{ data: BorrowSlip }>('/holds/pickup', data),

  cancel: (id: number, data?: HoldCancelRequest) =>
    api.put<{ data: Hold }>(`/holds/${id}/cancel`, data ?? {}),
}
