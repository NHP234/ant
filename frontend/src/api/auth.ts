import api from './axios'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email: string
  fullName: string
  studentId?: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: {
    id: number
    username: string
    email: string
    fullName: string
    role: string
  }
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<{ data: AuthResponse }>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<{ data: AuthResponse }>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<{ data: AuthResponse }>('/auth/refresh', { refreshToken }),
}
