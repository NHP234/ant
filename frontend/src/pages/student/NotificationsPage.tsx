import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '@/api/notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationApi.getAll(page, 10),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Đã đánh dấu tất cả đã đọc')
    },
  })

  const notifications = data?.data?.data
  const formatDate = (date: string) => new Date(date).toLocaleString('vi-VN')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Thông báo</h2>
          <p className="text-muted-foreground">Thông báo từ hệ thống thư viện</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 w-48 bg-muted rounded mb-2" />
                <div className="h-3 w-72 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !notifications?.content?.length ? (
        <div className="text-center py-12 text-muted-foreground">Không có thông báo</div>
      ) : (
        <div className="space-y-3">
          {notifications.content.map((n) => (
            <Card
              key={n.id}
              className={n.isRead ? 'opacity-60' : 'border-primary/30'}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
            >
              <CardContent className="p-4 cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{n.title}</h4>
                      {!n.isRead && <Badge className="text-[10px] px-1.5">Mới</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(n.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {notifications && notifications.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {notifications.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= notifications.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}
    </div>
  )
}
