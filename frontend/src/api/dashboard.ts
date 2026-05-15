import api from './axios'

export interface DashboardStats {
  totalBooks: number
  totalUsers: number
  activeBorrows: number
  overdueBooks: number
  totalCategories: number
}

export const dashboardApi = {
  getStats: () =>
    api.get<{ data: DashboardStats }>('/dashboard/stats'),
}
