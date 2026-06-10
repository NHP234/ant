import api from './axios'
import type { User } from './users'
import type { BookCopy } from './books'

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
  registerUser: (data: NfcRegisterUserRequest) =>
    api.post<{ data: User }>('/nfc/register-user', data),

  registerBookCopy: (data: NfcRegisterBookCopyRequest) =>
    api.post<{ data: BookCopy }>('/nfc/register-book-copy', data),
    
  getStreamUrl: () => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8080/api'
    return `${baseURL}/nfc/stream`
  }
}
