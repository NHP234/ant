import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { borrowApi, type BorrowRecord } from '@/api/borrows'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  BORROWING: 'default',
  RETURNED: 'secondary',
  OVERDUE: 'destructive',
}

const statusLabels: Record<string, string> = {
  BORROWING: 'Đang mượn',
  RETURNED: 'Đã trả',
  OVERDUE: 'Quá hạn',
}

export default function BorrowManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'borrows', page],
    queryFn: () => borrowApi.getAll(page, 10),
  })

  const returnMutation = useMutation({
    mutationFn: (borrowId: number) => borrowApi.return(borrowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'borrows'] })
      toast.success('Trả sách thành công')
    },
    onError: () => toast.error('Trả sách thất bại'),
  })

  const borrows = data?.data?.data
  const filtered = borrows?.content?.filter(
    (b) => filter === 'ALL' || b.status === filter
  ) ?? []

  const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý mượn trả</h2>
        <p className="text-muted-foreground">Theo dõi tình trạng mượn trả sách</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v)}>
        <TabsList>
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
          <TabsTrigger value="BORROWING">Đang mượn</TabsTrigger>
          <TabsTrigger value="OVERDUE">Quá hạn</TabsTrigger>
          <TabsTrigger value="RETURNED">Đã trả</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người mượn</TableHead>
              <TableHead>Sách</TableHead>
              <TableHead>Ngày mượn</TableHead>
              <TableHead>Hạn trả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !filtered.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không có bản ghi</TableCell></TableRow>
            ) : (
              filtered.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.userFullName}</TableCell>
                  <TableCell>{record.bookTitle}</TableCell>
                  <TableCell>{formatDate(record.borrowDate)}</TableCell>
                  <TableCell>{formatDate(record.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[record.status]}>
                      {statusLabels[record.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {record.status !== 'RETURNED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => returnMutation.mutate(record.id)}
                        disabled={returnMutation.isPending}
                      >
                        Xác nhận trả
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {borrows && borrows.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {borrows.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= borrows.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}
    </div>
  )
}
