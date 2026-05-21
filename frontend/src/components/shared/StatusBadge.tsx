import { Badge } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  BORROWING: { label: 'Đang mượn', variant: 'default' },
  RETURNED: { label: 'Đã trả', variant: 'secondary' },
  OVERDUE: { label: 'Quá hạn', variant: 'destructive' },
  ACTIVE: { label: 'Đang chờ', variant: 'default' },
  FULFILLED: { label: 'Đã xác nhận', variant: 'secondary' },
  EXPIRED: { label: 'Hết hạn', variant: 'destructive' },
  CANCELED: { label: 'Đã hủy', variant: 'outline' },
  AVAILABLE: { label: 'Có sẵn', variant: 'default' },
  RESERVED: { label: 'Giữ chỗ', variant: 'secondary' },
  BORROWED: { label: 'Đang mượn', variant: 'secondary' },
  DAMAGED: { label: 'Hư hỏng', variant: 'destructive' },
  LOST: { label: 'Mất', variant: 'destructive' },
}

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
