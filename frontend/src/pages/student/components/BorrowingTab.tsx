import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  BORROWING: 'default',
  OVERDUE: 'destructive',
}

const statusLabels: Record<string, string> = {
  BORROWING: 'Đang mượn',
  OVERDUE: 'Quá hạn',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

export default function BorrowingTab() {
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
