import { useQuery } from '@tanstack/react-query'
import { borrowApi } from '@/api/borrows'
import type { BorrowRecord } from '@/api/borrows'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import BookCover from '@/components/shared/BookCover'
import { BookOpen, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  BORROWING: 'default',
  OVERDUE: 'destructive',
}

const statusLabels: Record<string, string> = {
  BORROWING: 'Đang mượn',
  OVERDUE: 'Quá hạn',
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function getDaysRemaining(dueDate: string) {
  const diffTime = new Date(dueDate).getTime() - new Date().getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function BorrowCard({ record }: { record: BorrowRecord }) {
  const daysRemaining = getDaysRemaining(record.dueDate)
  const isOverdue = daysRemaining < 0
  const isWarning = daysRemaining >= 0 && daysRemaining <= 3

  let progressColor = "bg-success"
  if (isOverdue) progressColor = "bg-destructive"
  else if (isWarning) progressColor = "bg-warning"

  const totalDays = 14
  const daysPassed = totalDays - (isOverdue ? 0 : daysRemaining)
  const progressPercent = isOverdue ? 100 : Math.min(100, Math.max(0, (daysPassed / totalDays) * 100))

  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-32 md:w-40 aspect-[2/3] sm:aspect-auto bg-muted shrink-0 relative">
          <BookCover src={record.bookCoverImageUrl} title={record.bookTitle} showIcon />
        </div>
        
        <div className="flex-1 flex flex-col p-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Link to={`/books/${record.bookId}`} className="hover:underline decoration-primary underline-offset-2">
                <h3 className="font-semibold text-lg line-clamp-1">{record.bookTitle}</h3>
              </Link>
              <p className="text-muted-foreground text-sm mt-1">{record.bookAuthor}</p>
            </div>
            <Badge variant={statusColors[record.status]}>
              {statusLabels[record.status]}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Ngày mượn</div>
              <div className="font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground/60" />
                {formatDate(record.borrowDate)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Ngày hẹn trả</div>
              <div className={`font-medium flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : ''}`}>
                <Clock className="w-4 h-4 text-muted-foreground/60" />
                {formatDate(record.dueDate)}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tiến độ thời gian mượn</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${isOverdue ? 'text-destructive' : isWarning ? 'text-warning' : 'text-success'}`}>
                {isOverdue && <AlertTriangle className="w-4 h-4" />}
                {isOverdue ? `Quá hạn ${Math.abs(daysRemaining)} ngày` : `Còn ${daysRemaining} ngày`}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${progressColor} transition-all duration-1000`} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function BorrowingTab() {
  const page = 0

  const { data, isLoading } = useQuery({
    queryKey: ['my-borrows', 'borrowing', page],
    queryFn: () => borrowApi.getMyBorrows(page, 20, ['BORROWING', 'OVERDUE']),
  })

  const borrows = data?.data?.data
  const borrowing = borrows?.content ?? []

  if (isLoading) return (
    <div className="space-y-4 pt-4">
      {[1, 2].map(i => (
        <Card key={i} className="h-48 animate-pulse bg-muted" />
      ))}
    </div>
  )
  
  if (!borrowing.length) return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <p>Bạn không đang mượn cuốn sách nào.</p>
    </div>
  )

  return (
    <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {borrowing.map(record => (
        <BorrowCard key={record.id} record={record} />
      ))}
    </div>
  )
}
