import type { APIRequestContext } from '@playwright/test'
import { API_BASE } from '../fixtures/test-data'

async function parseJsonResponse(res: { ok: () => boolean; status: () => number; statusText: () => string; text: () => Promise<string> }) {
  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok()) {
    throw new Error(`API request failed: ${res.status()} ${res.statusText()} ${text}`)
  }

  return body
}

export async function apiLogin(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  })
  const body = await parseJsonResponse(res)
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
  return parseJsonResponse(res)
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
  return parseJsonResponse(res)
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
  return parseJsonResponse(res)
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
  return parseJsonResponse(res)
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
  return parseJsonResponse(res)
}

export async function apiGetBooks(request: APIRequestContext) {
  const res = await request.get(`${API_BASE}/books?size=50`)
  return parseJsonResponse(res)
}

export async function apiGetHolds(
  request: APIRequestContext,
  token: string,
) {
  const res = await request.get(`${API_BASE}/holds`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseJsonResponse(res)
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
  return parseJsonResponse(res)
}
