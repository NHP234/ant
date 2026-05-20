import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import { holdApi } from '@/api/holds'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

function HoldsTab() {
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

function BorrowingTab() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-borrows', 'borrowing', page],
    queryFn: () => borrowApi.getMyBorrows(page, 20),
  })

  const borrows = data?.data?.data
  const borrowing = borrows?.content?.filter(r => r.status === 'BORROWING' || r.status === 'OVERDUE') ?? []

  if (isLoading) return <div className="text-center py-8">Đang tải...</div>
  if (!borrowing.length) return <div className="text-center py-8 text-muted-foreground">Bạn không đang mượn sách nào</div>

  const isOverdue = (dueDate: string, status: string) => status === 'BORROWING' && new Date(dueDate) < new Date()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên sách</TableHead>
            <TableHead>Tác giả</TableHead>
            <TableHead>Ngày mượn</TableHead>
            <TableHead>Hạn trả</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {borrowing.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.bookTitle}</TableCell>
              <TableCell className="text-muted-foreground">{record.bookAuthor}</TableCell>
              <TableCell>{formatDate(record.borrowDate)}</TableCell>
              <TableCell className={isOverdue(record.dueDate, record.status) ? 'text-destructive font-medium' : ''}>
                {formatDate(record.dueDate)}
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[record.status]}>
                  {statusLabels[record.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function HistoryTab() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-borrows', 'history', page],
    queryFn: () => borrowApi.getMyBorrows(page, 20),
  })

  const borrows = data?.data?.data
  const returned = borrows?.content?.filter(r => r.status === 'RETURNED') ?? []

  if (isLoading) return <div className="text-center py-8">Đang tải...</div>
  if (!returned.length) return <div className="text-center py-8 text-muted-foreground">Bạn chưa trả sách nào</div>

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên sách</TableHead>
            <TableHead>Tác giả</TableHead>
            <TableHead>Ngày mượn</TableHead>
            <TableHead>Ngày trả</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returned.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.bookTitle}</TableCell>
              <TableCell className="text-muted-foreground">{record.bookAuthor}</TableCell>
              <TableCell>{formatDate(record.borrowDate)}</TableCell>
              <TableCell>{record.returnDate ? formatDate(record.returnDate) : '-'}</TableCell>
              <TableCell>
                <Badge variant="secondary">Đã trả</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {borrows && borrows.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Trước</Button>
          <span className="text-sm text-muted-foreground">Trang {page + 1} / {borrows.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= borrows.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau →</Button>
        </div>
      )}
    </div>
  )
}

export default function MyBorrowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sách đã mượn</h2>
        <p className="text-muted-foreground">Quản lý sách đã mượn, đặt trước và lịch sử</p>
      </div>

      <Tabs defaultValue="holds">
        <TabsList>
          <TabsTrigger value="holds">Đang đặt trước</TabsTrigger>
          <TabsTrigger value="borrowing">Đang mượn</TabsTrigger>
          <TabsTrigger value="history">Lịch sử trả</TabsTrigger>
        </TabsList>
        <TabsContent value="holds"><HoldsTab /></TabsContent>
        <TabsContent value="borrowing"><BorrowingTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}
