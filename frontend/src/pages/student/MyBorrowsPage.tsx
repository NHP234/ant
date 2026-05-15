import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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

export default function MyBorrowsPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-borrows', page],
    queryFn: () => borrowApi.getMyBorrows(page, 10),
  })

  const borrows = data?.data?.data
  const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN')

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'BORROWING' && new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sách đang mượn</h2>
        <p className="text-muted-foreground">Lịch sử mượn trả sách của bạn</p>
      </div>

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
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !borrows?.content?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Bạn chưa mượn sách nào</TableCell></TableRow>
            ) : (
              borrows.content.map((record) => (
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
