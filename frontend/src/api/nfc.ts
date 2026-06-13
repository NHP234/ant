import api from './axios'
import type { BookCopy, PageResponse } from './books'

export interface NfcStudent {
  id: number
  username: string
  fullName: string
  studentId: string | null
  isActive: boolean
  nfcCardUid: string | null
}

export interface NfcRegisterUserRequest {
  userId: number
  nfcCardUid: string
}

export interface NfcRegisterBookCopyRequest {
  copyId: number
  nfcTagUid: string
}

export interface NfcScanEvent {
  type: 'USER' | 'BOOK_COPY' | 'UNKNOWN'
  data: {
    uid?: string
    id?: number
    nfcTagUid?: string | null
  }
}

export const nfcApi = {
  getStudents: (query = '', page = 0, size = 10) =>
    api.get<{ data: PageResponse<NfcStudent> }>('/nfc/students', {
      params: { query, page, size },
    }),

  registerUser: (data: NfcRegisterUserRequest) =>
    api.post<{ data: NfcStudent }>('/nfc/register-user', data),

  registerBookCopy: (data: NfcRegisterBookCopyRequest) =>
    api.post<{ data: BookCopy }>('/nfc/register-book-copy', data),
    
  getStreamUrl: () => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8080/api'
    return `${baseURL}/nfc/stream`
  }
}
