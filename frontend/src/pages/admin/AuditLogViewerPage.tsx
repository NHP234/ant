import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogApi } from '@/api/auditLogs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Pagination from '@/components/shared/Pagination'

const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CREATE: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
  BORROW: 'default',
  RETURN: 'secondary',
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('vi-VN')
}

export default function AuditLogViewerPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditLogApi.getAll(page, 20),
  })

  const logs = data?.data?.data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nhật ký hoạt động</h2>
        <p className="text-muted-foreground">Theo dõi tất cả thao tác trong hệ thống</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead>Hành động</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead className="hidden lg:table-cell">Chi tiết</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !logs?.content?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Không có nhật ký nào</TableCell></TableRow>
            ) : (
              logs.content.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-medium">{log.user?.username ?? 'System'}</TableCell>
                  <TableCell>
                    <Badge variant={actionColors[log.action] ?? 'outline'}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {log.entityType} #{log.entityId}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                    {log.details || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {logs && logs.totalPages > 1 && (
        <Pagination page={page} totalPages={logs.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
