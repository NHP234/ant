import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import type { BorrowRecord } from '@/api/borrows'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import Pagination from '@/components/shared/Pagination'
import BookCover from '@/components/shared/BookCover'
import { CalendarCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function HistoryCard({ record }: { record: BorrowRecord }) {
  return (
    <Card className="overflow-hidden border-border/50 hover:border-border/80 transition-all bg-card/50">
      <div className="flex gap-4 p-4">
        <div className="w-16 sm:w-20 aspect-[2/3] bg-muted shrink-0 relative rounded-sm overflow-hidden opacity-80 grayscale-[30%]">
          <BookCover
            src={record.bookCoverImageUrl}
            title={record.bookTitle}
            showIcon
            fallbackClassName="[&_span]:hidden"
          />
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start gap-2">
            <div>
              <Link to={`/books/${record.bookId}`} className="hover:underline decoration-primary">
                <h3 className="font-medium text-base line-clamp-1">{record.bookTitle}</h3>
              </Link>
              <p className="text-muted-foreground text-xs mt-0.5">{record.bookAuthor}</p>
            </div>
            <Badge variant="secondary" className="font-normal shrink-0">
              Đã trả sách
            </Badge>
          </div>

          <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex flex-col">
              <span className="uppercase text-[10px] tracking-wider mb-0.5">Ngày mượn</span>
              <span>{formatDate(record.borrowDate)}</span>
            </div>
            <div className="flex flex-col">
              <span className="uppercase text-[10px] tracking-wider mb-0.5">Ngày trả</span>
              <span className="flex items-center gap-1 font-medium text-foreground/70">
                <CalendarCheck className="w-3.5 h-3.5" />
                {record.returnDate ? formatDate(record.returnDate) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function HistoryTab() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-borrows', 'history', page],
    queryFn: () => borrowApi.getMyBorrows(page, 20, ['RETURNED']),
  })

  const borrows = data?.data?.data
  const returned = borrows?.content ?? []

  if (isLoading) return (
    <div className="grid sm:grid-cols-2 gap-4 pt-4">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-28 animate-pulse bg-muted" />)}
    </div>
  )
  if (!returned.length) return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CalendarCheck className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <p>Bạn chưa có lịch sử trả sách nào.</p>
    </div>
  )

  return (
    <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid md:grid-cols-2 gap-4">
        {returned.map(record => (
           <HistoryCard key={record.id} record={record} />
        ))}
      </div>

      {borrows && borrows.totalPages > 1 && (
        <div className="pt-4 border-t">
          <Pagination page={page} totalPages={borrows.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
