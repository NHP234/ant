import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holdApi, type Hold } from '@/api/holds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import PageHeader from '@/components/shared/PageHeader'

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

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function HoldRow({ hold }: { hold: Hold }) {
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: (id: number) => holdApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holds'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'borrow-slips'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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

function ActivePickupGroups({ holds }: { holds: Hold[] }) {
  const queryClient = useQueryClient()

  const pickupMutation = useMutation({
    mutationFn: (userId: number) => holdApi.pickup({ userId, source: 'COUNTER' }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holds'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'borrow-slips'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      const recordCount = response.data.data.records?.length ?? 0
      toast.success(`Đã lập phiếu mượn gồm ${recordCount} sách`)
    },
    onError: () => toast.error('Lập phiếu nhận sách thất bại'),
  })

  const groups = useMemo(() => {
    const byUser = new Map<number, { userId: number; userFullName: string; holds: Hold[] }>()
    holds
      .filter((hold) => hold.status === 'ACTIVE')
      .forEach((hold) => {
        const group = byUser.get(hold.userId) ?? {
          userId: hold.userId,
          userFullName: hold.userFullName,
          holds: [],
        }
        group.holds.push(hold)
        byUser.set(hold.userId, group)
      })

    return Array.from(byUser.values()).map((group) => ({
      ...group,
      nearestExpiry: group.holds
        .map((hold) => hold.expiresAt)
        .sort((first, second) => new Date(first).getTime() - new Date(second).getTime())[0],
    }))
  }, [holds])

  if (!groups.length) return null

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Nhận sách đã đặt</h2>
        <p className="text-sm text-muted-foreground">
          Gom toàn bộ sách đang giữ của một sinh viên thành một phiếu mượn.
        </p>
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.userId}
            className="flex flex-col gap-3 rounded-md border bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="font-medium">{group.userFullName}</div>
              <div className="text-sm text-muted-foreground">
                {group.holds.length} sách đang chờ nhận · Hạn gần nhất: {formatDateTime(group.nearestExpiry)}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {group.holds.map((hold) => hold.bookTitle).join(', ')}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => pickupMutation.mutate(group.userId)}
              disabled={pickupMutation.isPending}
            >
              Lập phiếu nhận tất cả
            </Button>
          </div>
        ))}
      </div>
    </div>
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
      <PageHeader
        title="Quản lý đặt trước"
        description="Xác nhận hoặc hủy yêu cầu đặt mượn sách"
      />

      <ActivePickupGroups holds={holds?.content ?? []} />

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
                <HoldRow key={hold.id} hold={hold} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {holds && holds.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {holds.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= holds.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
