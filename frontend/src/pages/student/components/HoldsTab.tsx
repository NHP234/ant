import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { holdApi } from '@/api/holds'
import type { Hold } from '@/api/holds'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BookCover from '@/components/shared/BookCover'
import { toast } from 'sonner'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const holdStatusLabels: Record<string, string> = {
  ACTIVE: 'Đang chờ nhận',
  FULFILLED: 'Đã nhận sách',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
}

const holdStatusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  FULFILLED: 'secondary',
  EXPIRED: 'destructive',
  CANCELED: 'outline',
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function getHoursRemaining(expiresAt: string) {
  const diffTime = new Date(expiresAt).getTime() - new Date().getTime()
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60)))
}

function HoldCard({ hold, onCancel, isCanceling }: { hold: Hold, onCancel: (id: number) => void, isCanceling: boolean }) {
  const isActive = hold.status === 'ACTIVE'
  const isExpired = hold.status === 'EXPIRED'
  const hoursRemaining = isActive ? getHoursRemaining(hold.expiresAt) : 0
  const isWarning = isActive && hoursRemaining <= 6

  const totalHours = 24
  const hoursPassed = isActive ? (totalHours - hoursRemaining) : totalHours
  const progressPercent = isActive ? Math.min(100, Math.max(0, (hoursPassed / totalHours) * 100)) : 100

  let progressColor = "bg-success"
  if (isWarning) progressColor = "bg-warning"
  if (isExpired) progressColor = "bg-destructive"

  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-32 md:w-40 aspect-[2/3] sm:aspect-auto bg-muted shrink-0 relative opacity-90">
          <BookCover
            src={hold.bookCoverImageUrl}
            title={hold.bookTitle}
            showIcon
            imgClassName={!isActive ? 'grayscale opacity-70' : ''}
          />
        </div>
        
        <div className="flex-1 flex flex-col p-5">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Link to={`/books/${hold.bookId}`} className="hover:underline decoration-primary underline-offset-2">
                <h3 className="font-semibold text-lg line-clamp-1">{hold.bookTitle}</h3>
              </Link>
              <p className="text-muted-foreground text-sm mt-1">{hold.bookAuthor}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={holdStatusColors[hold.status]}>
                {holdStatusLabels[hold.status]}
              </Badge>
              {isActive && (
                <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => onCancel(hold.id)} disabled={isCanceling}>
                  Hủy đặt
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider">Thời gian đặt</div>
              <div className="font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                {formatDateTime(hold.reservedAt)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider">Hết hạn giữ sách</div>
              <div className={`font-medium flex items-center gap-1.5 ${isWarning ? 'text-warning' : ''}`}>
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                {formatDateTime(hold.expiresAt)}
              </div>
            </div>
          </div>

          {isActive && (
            <div className="mt-auto pt-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-medium text-muted-foreground">Thời gian chờ nhận sách</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${isWarning ? 'text-warning' : 'text-success'}`}>
                  {isWarning && <AlertCircle className="w-4 h-4" />}
                  Còn {hoursRemaining} giờ
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${progressColor} transition-all duration-1000`} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {!isActive && (
            <div className="mt-auto pt-6 text-sm text-muted-foreground italic">
              {hold.status === 'FULFILLED' && `Đã nhận sách vào lúc ${formatDateTime(hold.fulfilledAt!)}.`}
              {hold.status === 'EXPIRED' && "Phiếu đặt trước đã quá hạn do bạn không đến nhận sách."}
              {hold.status === 'CANCELED' && "Phiếu đặt trước đã bị hủy."}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function HoldsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-holds', page],
    queryFn: () => holdApi.getMyHolds(page, 10, ['ACTIVE']),
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

  if (isLoading) return (
    <div className="space-y-4 pt-4">
       {[1, 2].map(i => <Card key={i} className="h-40 animate-pulse bg-muted" />)}
    </div>
  )
  if (!holds?.content?.length) return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Clock className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <p>Bạn chưa đặt mượn cuốn sách nào.</p>
    </div>
  )

  return (
    <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        {holds.content.map((hold) => (
          <HoldCard 
            key={hold.id} 
            hold={hold} 
            onCancel={(id) => cancelMutation.mutate(id)} 
            isCanceling={cancelMutation.isPending} 
          />
        ))}
      </div>

      {holds.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground">Trang {page + 1} / {holds.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= holds.totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  )
}
