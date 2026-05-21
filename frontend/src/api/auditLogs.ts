import api from './axios'
import type { PageResponse } from './books'

export interface AuditLog {
  id: number
  user: { id: number; username: string; fullName: string } | null
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
