import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holdApi } from '@/api/holds'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

const holdStatusLabels: Record<string, string> = {
  ACTIVE: 'Đang chờ',
  FULFILLED: 'Đã xác nhận',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
}

const holdStatusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  FULFILLED: 'secondary',
  EXPIRED: 'destructive',
  CANCELED: 'outline',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

export default function HoldsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-holds', page],
    queryFn: () => holdApi.getMyHolds(page, 10),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => holdApi.cancel(id, { reason: 'USER_CANCELED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-holds'] })
      toast.success('Đã hủy đặt mượn')
    },
    onError: () => toast.error('Hủy thất bại'),
  })

  const holds = data?.data?.data

  if (isLoading) return <div className="text-center py-8">Đang tải...</div>
  if (!holds?.content?.length) return <div className="text-center py-8 text-muted-foreground">Bạn chưa đặt mượn sách nào</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sách</TableHead>
            <TableHead>Đặt lúc</TableHead>
            <TableHead>Hết hạn</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holds.content.map((hold) => (
            <TableRow key={hold.id}>
              <TableCell className="font-medium">{hold.bookTitle}</TableCell>
              <TableCell>{formatDate(hold.reservedAt)}</TableCell>
              <TableCell className={hold.status === 'ACTIVE' && new Date(hold.expiresAt) < new Date() ? 'text-destructive' : ''}>
                {formatDate(hold.expiresAt)}
              </TableCell>
              <TableCell>
                <Badge variant={holdStatusColors[hold.status]}>
                  {holdStatusLabels[hold.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {hold.status === 'ACTIVE' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => cancelMutation.mutate(hold.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Hủy
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {holds.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</Button>
          <span className="text-sm text-muted-foreground">Trang {page + 1} / {holds.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= holds.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau →</Button>
        </div>
      )}
    </div>
  )
}
