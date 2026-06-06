import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { holdApi } from '@/api/holds'
import { borrowSlipApi } from '@/api/borrowSlips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import PageHeader from '@/components/shared/PageHeader'
import { BookOpen, Users, BookMarked, AlertTriangle, Tags } from 'lucide-react'
import type { ComponentType } from 'react'

const holdStatusLabels: Record<string, string> = {
  ACTIVE: 'Đang chờ',
  FULFILLED: 'Đã xác nhận',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã hủy',
}

const holdStatusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  FULFILLED: 'secondary',
  EXPIRED: 'destructive',
  CANCELED: 'outline',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN')
}

interface StatCardDef {
  title: string
  value: string | number
  icon: ComponentType<{ className?: string }>
}

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  const staffBasePath = isAdmin ? '/admin' : '/librarian'

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
  })

  const { data: holdsData } = useQuery({
    queryKey: ['admin', 'holds', 'active'],
    queryFn: () => holdApi.getAll(0, 5),
  })

  const { data: slipsData } = useQuery({
    queryKey: ['admin', 'borrow-slips', 'recent'],
    queryFn: () => borrowSlipApi.getAll(0, 10),
  })

  const stats = statsData?.data?.data
  const pendingHolds = holdsData?.data?.data?.content?.filter(h => h.status === 'ACTIVE') ?? []
  const recentSlips = slipsData?.data?.data?.content ?? []

  const cards: StatCardDef[] = [
    { title: 'Tổng số sách', value: stats?.totalBooks ?? '-', icon: BookOpen },
    { title: 'Người dùng', value: stats?.totalUsers ?? '-', icon: Users },
    { title: 'Đang mượn', value: stats?.activeBorrows ?? '-', icon: BookMarked },
    { title: 'Quá hạn', value: stats?.overdueBooks ?? '-', icon: AlertTriangle },
    { title: 'Danh mục', value: stats?.totalCategories ?? '-', icon: Tags },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={isAdmin ? 'Tổng quan hệ thống thư viện' : 'Tổng quan vận hành thư viện'}
      />

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded" /></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Holds đang chờ</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`${staffBasePath}/holds`}>Xem tất cả</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingHolds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Không có holds đang chờ</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Sách</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingHolds.map((hold) => (
                    <TableRow key={hold.id}>
                      <TableCell className="font-medium">{hold.userFullName}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{hold.bookTitle}</TableCell>
                      <TableCell className="text-sm">{formatDate(hold.expiresAt)}</TableCell>
                      <TableCell>
                        <Badge variant={holdStatusColors[hold.status]}>
                          {holdStatusLabels[hold.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSlips.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Chưa có hoạt động</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người mượn</TableHead>
                    <TableHead>Ngày mượn</TableHead>
                    <TableHead>SL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSlips.slice(0, 5).map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">{slip.userFullName}</TableCell>
                      <TableCell className="text-sm">{formatDate(slip.borrowDate)}</TableCell>
                      <TableCell>{slip.records?.length ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
