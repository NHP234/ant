import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { borrowSlipApi } from '@/api/borrowSlips'
import { borrowApi } from '@/api/borrows'
import type { BorrowSlip } from '@/api/borrowSlips'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'

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

const sourceLabels: Record<string, string> = {
  COUNTER: 'Tại quầy',
  NFC: 'NFC',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

function BorrowSlipRow({ slip }: { slip: BorrowSlip }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const returnMutation = useMutation({
    mutationFn: (recordId: number) => borrowApi.return(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'borrow-slips'] })
      toast.success('Trả sách thành công')
    },
    onError: () => toast.error('Trả sách thất bại'),
  })

  const allReturned = slip.records.every(r => r.status === 'RETURNED')
  const anyOverdue = slip.records.some(r => r.status === 'OVERDUE')

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell className="font-medium">{slip.userFullName}</TableCell>
        <TableCell>{formatDate(slip.borrowDate)}</TableCell>
        <TableCell>{formatDate(slip.dueDate)}</TableCell>
        <TableCell>
          <Badge variant={slip.source === 'NFC' ? 'secondary' : 'outline'}>
            {sourceLabels[slip.source] || slip.source}
          </Badge>
        </TableCell>
        <TableCell>
          {allReturned ? (
            <Badge variant="secondary">Đã trả hết</Badge>
          ) : anyOverdue ? (
            <Badge variant="destructive">Quá hạn</Badge>
          ) : (
            <Badge variant="default">Đang mượn</Badge>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-0">
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sách</TableHead>
                    <TableHead>Bản số</TableHead>
                    <TableHead>Mượn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slip.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.bookTitle}</TableCell>
                      <TableCell className="text-muted-foreground">#{record.copyNumber}</TableCell>
                      <TableCell>{formatDate(record.borrowDate)}</TableCell>
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
                            onClick={(e) => { e.stopPropagation(); returnMutation.mutate(record.id) }}
                            disabled={returnMutation.isPending}
                          >
                            Xác nhận trả
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export default function BorrowManagementPage() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'borrow-slips', page],
    queryFn: () => borrowSlipApi.getAll(page, 10),
  })

  const slips = data?.data?.data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý mượn trả</h2>
        <p className="text-muted-foreground">Theo dõi phiếu mượn và tình trạng trả sách</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Người mượn</TableHead>
              <TableHead>Ngày mượn</TableHead>
              <TableHead>Hạn trả</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !slips?.content?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không có phiếu mượn</TableCell></TableRow>
            ) : (
              slips.content.map((slip) => (
                <BorrowSlipRow key={slip.id} slip={slip} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {slips && slips.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {slips.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= slips.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}
    </div>
  )
}
