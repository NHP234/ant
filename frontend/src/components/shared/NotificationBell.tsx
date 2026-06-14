import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell } from 'lucide-react'
import { notificationApi } from '@/api/notifications'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.getUnreadCount(),
    refetchInterval: 30000,
  })

  const count = data?.data?.data?.unreadCount ?? 0

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')} aria-label="Thông báo">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </Button>
  )
}
