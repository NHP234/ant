import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { notificationApi } from '@/api/notifications'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000,
  })

  const count = data?.data?.data?.count ?? 0

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
      <span className="text-lg">🔔</span>
      {count > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </Button>
  )
}
