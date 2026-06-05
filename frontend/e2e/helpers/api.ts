import type { APIRequestContext } from '@playwright/test'
import { API_BASE } from '../fixtures/test-data'

export async function apiLogin(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  })
  const body = await res.json()
  return body.data.accessToken
}

export async function apiRegister(
  request: APIRequestContext,
  data: {
    username: string
    password: string
    email: string
    fullName: string
    studentId?: string
  },
) {
  const res = await request.post(`${API_BASE}/auth/register`, { data })
  return res.json()
}

export async function apiCreateBook(
  request: APIRequestContext,
  token: string,
  data: {
    title: string
    author: string
    isbn?: string
    quantity?: number
  },
) {
  const res = await request.post(`${API_BASE}/books`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiCreateCategory(
  request: APIRequestContext,
  token: string,
  name: string,
) {
  const res = await request.post(`${API_BASE}/categories`, {
    data: { name },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiCreateUser(
  request: APIRequestContext,
  token: string,
  data: {
    username: string
    password: string
    email: string
    fullName: string
    studentId?: string
    role: 'ADMIN' | 'LIBRARIAN' | 'STUDENT'
  },
) {
  const res = await request.post(`${API_BASE}/users`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiCreateHold(
  request: APIRequestContext,
  token: string,
  bookId: number,
) {
  const res = await request.post(`${API_BASE}/holds`, {
    data: { bookId },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiGetBooks(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/books?size=50`)
  return res.json()
}

export async function apiGetHolds(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_BASE}/holds`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiConfirmHold(
  request: APIRequestContext,
  token: string,
  holdId: number,
) {
  const res = await request.put(`${API_BASE}/holds/${holdId}/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  })
  return res.json()
}
