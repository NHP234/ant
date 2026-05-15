import api from './axios'

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  publisher: string
  publishYear: number
  description: string
  quantity: number
  availableQuantity: number
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
  number: number
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

export type BookUpdateRequest = Partial<BookCreateRequest>

export const bookApi = {
  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Book> }>('/books', { params: { page, size } }),

  getById: (id: number) =>
    api.get<{ data: Book }>(`/books/${id}`),

  search: (query: string, page = 0, size = 10) =>
    api.get<{ data: PageResponse<Book> }>('/books/search', { params: { query, page, size } }),

  create: (data: BookCreateRequest) =>
    api.post<{ data: Book }>('/books', data),

  update: (id: number, data: BookUpdateRequest) =>
    api.put<{ data: Book }>(`/books/${id}`, data),

  delete: (id: number) =>
    api.delete(`/books/${id}`),
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
