import api from './axios'
import type { PageResponse } from './books'

export interface Notification {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export const notificationApi = {
  getAll: (page = 0, size = 10) =>
    api.get<{ data: PageResponse<Notification> }>('/notifications', { params: { page, size } }),

  getUnreadCount: () =>
    api.get<{ data: { unreadCount: number } }>('/notifications/unread-count'),

  markAsRead: (id: number) =>
    api.put(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),
}
