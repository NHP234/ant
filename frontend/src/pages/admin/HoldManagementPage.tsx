import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holdApi, type Hold } from '@/api/holds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const statusLabels: Record<string, string> = {
  ACTIVE: 'Đang chờ',
  FULFILLED: 'Đã xác nhận',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  FULFILLED: 'secondary',
  EXPIRED: 'destructive',
  CANCELED: 'outline',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

function HoldRow({ hold, refetch }: { hold: Hold; refetch: () => void }) {
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: (id: number) => holdApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holds'] })
      toast.success('Xác nhận mượn thành công')
    },
    onError: () => toast.error('Xác nhận thất bại'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => holdApi.cancel(id, { reason: 'LIBRARIAN_CANCELED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holds'] })
      toast.success('Đã hủy hold')
    },
    onError: () => toast.error('Hủy thất bại'),
  })

  return (
    <TableRow>
      <TableCell className="font-medium">{hold.userFullName}</TableCell>
      <TableCell className="max-w-[200px] truncate">{hold.bookTitle}</TableCell>
      <TableCell>#{hold.copyNumber ?? '-'}</TableCell>
      <TableCell>{formatDate(hold.reservedAt)}</TableCell>
      <TableCell>{formatDate(hold.expiresAt)}</TableCell>
      <TableCell>
        <Badge variant={statusColors[hold.status]}>
          {statusLabels[hold.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right space-x-1">
        {hold.status === 'ACTIVE' && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => confirmMutation.mutate(hold.id)}
              disabled={confirmMutation.isPending}
            >
              Xác nhận mượn
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => { if (confirm('Hủy hold này?')) cancelMutation.mutate(hold.id) }}
              disabled={cancelMutation.isPending}
            >
              Hủy
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function HoldManagementPage() {
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'holds', page],
    queryFn: () => holdApi.getAll(page, 10),
  })

  const holds = data?.data?.data
  const filtered = holds?.content?.filter(
    (h) => filter === 'ALL' || h.status === filter
  ) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý đặt trước</h2>
        <p className="text-muted-foreground">Xác nhận hoặc hủy yêu cầu đặt mượn sách</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v)}>
        <TabsList>
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
          <TabsTrigger value="ACTIVE">Đang chờ</TabsTrigger>
          <TabsTrigger value="FULFILLED">Đã xác nhận</TabsTrigger>
          <TabsTrigger value="EXPIRED">Hết hạn</TabsTrigger>
          <TabsTrigger value="CANCELED">Đã hủy</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Sách</TableHead>
              <TableHead>Bản sao</TableHead>
              <TableHead>Đặt lúc</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !filtered.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có yêu cầu đặt trước</TableCell></TableRow>
            ) : (
              filtered.map((hold) => (
                <HoldRow key={hold.id} hold={hold} refetch={() => {}} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {holds && holds.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {holds.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= holds.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}
    </div>
  )
}
