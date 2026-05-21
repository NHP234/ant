import { API_BASE, ADMIN } from '../fixtures/test-data'

export async function apiLogin(
  request: any,
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
  request: any,
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
  request: any,
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
  request: any,
  token: string,
  name: string,
) {
  const res = await request.post(`${API_BASE}/categories`, {
    data: { name },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiCreateHold(
  request: any,
  token: string,
  bookId: number,
) {
  const res = await request.post(`${API_BASE}/holds`, {
    data: { bookId },
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiGetBooks(request: any) {
  const res = await request.get(`${API_BASE}/books?size=50`)
  return res.json()
}

export async function apiGetHolds(
  request: any,
  token: string,
) {
  const res = await request.get(`${API_BASE}/holds`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function apiConfirmHold(
  request: any,
  token: string,
  holdId: number,
) {
  const res = await request.put(`${API_BASE}/holds/${holdId}/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  })
  return res.json()
}
