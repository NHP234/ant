import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Pagination from '@/components/shared/Pagination'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

export default function HistoryTab() {
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
        <Pagination page={page} totalPages={borrows.totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
