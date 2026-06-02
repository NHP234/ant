import api from './axios'

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  publisher: string
  publishYear: number
  description: string
  totalCopies: number
  availableCopies: number
  coverImageUrl: string
  categories: Category[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  description: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  page: number
  last: boolean
}

export interface BookCreateRequest {
  title: string
  author: string
  isbn?: string
  publisher?: string
  publishYear?: number
  description?: string
  quantity: number
  coverImageUrl?: string
  categoryIds?: number[]
}

export interface BookUpdateRequest {
  title?: string
  author?: string
  isbn?: string
  publisher?: string
  publishYear?: number
  description?: string
  coverImageUrl?: string
  categoryIds?: number[]
}

export const bookApi = {
  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Book> }>('/books', { params: { page, size } }),

  getById: (id: number) =>
    api.get<{ data: Book }>(`/books/${id}`),

  getSimilar: (id: number, page = 0, size = 4) =>
    api.get<{ data: PageResponse<Book> }>(`/books/${id}/similar`, { params: { page, size } }),

  getByCategory: (categoryId: number, page = 0, size = 10) =>
    api.get<{ data: PageResponse<Book> }>(`/books/category/${categoryId}`, { params: { page, size } }),

  search: (q: string, page = 0, size = 10) =>
    api.get<{ data: PageResponse<Book> }>('/books/search', { params: { q, page, size } }),

  create: (data: BookCreateRequest) =>
    api.post<{ data: Book }>('/books', data),

  update: (id: number, data: BookUpdateRequest) =>
    api.put<{ data: Book }>(`/books/${id}`, data),

  delete: (id: number) =>
    api.delete(`/books/${id}`),
}

export interface BookCopy {
  id: number
  bookId: number
  copyNumber: number
  nfcTagUid: string | null
  status: 'AVAILABLE' | 'RESERVED' | 'BORROWED' | 'DAMAGED' | 'LOST'
  conditionNote: string | null
  createdAt: string
}

export const bookCopyApi = {
  getCopies: (bookId: number) =>
    api.get<{ data: BookCopy[] }>(`/books/${bookId}/copies`),

  addCopy: (bookId: number, nfcTagUid?: string) =>
    api.post<{ data: BookCopy }>(`/books/${bookId}/copies`, null, {
      params: nfcTagUid ? { nfcTagUid } : undefined,
    }),

  updateCopy: (bookId: number, copyId: number, params?: { nfcTagUid?: string; status?: string; conditionNote?: string }) =>
    api.put<{ data: BookCopy }>(`/books/${bookId}/copies/${copyId}`, null, { params }),

  deleteCopy: (bookId: number, copyId: number) =>
    api.delete(`/books/${bookId}/copies/${copyId}`),
}

export const categoryApi = {
  getAll: () =>
    api.get<{ data: Category[] }>('/categories'),

  create: (data: { name: string; description?: string }) =>
    api.post<{ data: Category }>('/categories', data),

  update: (id: number, data: { name: string; description?: string }) =>
    api.put<{ data: Category }>(`/categories/${id}`, data),

  delete: (id: number) =>
    api.delete(`/categories/${id}`),
}
