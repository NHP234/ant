import api from './axios'
import type { PageResponse } from './books'

export interface AuditLog {
  id: number
  userId: number | null
  username: string | null
  userFullName: string | null
  action: string
  entityType: string
  entityId: number
  details: string
  ipAddress: string | null
  createdAt: string
}

export const auditLogApi = {
  getAll: (page = 0, size = 20) =>
    api.get<{ data: PageResponse<AuditLog> }>('/audit-logs', { params: { page, size } }),
}
