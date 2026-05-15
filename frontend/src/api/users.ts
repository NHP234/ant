import api from './axios'
import type { PageResponse } from './books'

export interface User {
  id: number
  username: string
  email: string
  fullName: string
  studentId: string | null
  role: string
  isActive: boolean
  createdAt: string
}

export interface CreateUserRequest {
  username: string
  password: string
  email: string
  fullName: string
  studentId?: string
  role: string
}

export const userApi = {
  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<User> }>('/users', { params: { page, size } }),

  getById: (id: number) =>
    api.get<{ data: User }>(`/users/${id}`),

  getMyProfile: () =>
    api.get<{ data: User }>('/users/me'),

  create: (data: CreateUserRequest) =>
    api.post<{ data: User }>('/users', data),

  updateRole: (id: number, role: string) =>
    api.put<{ data: User }>(`/users/${id}/role`, { role }),

  updateStatus: (id: number, active: boolean) =>
    api.put<{ data: User }>(`/users/${id}/status`, { active }),
}
