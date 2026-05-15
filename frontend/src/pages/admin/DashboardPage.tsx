import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
  })

  const stats = data?.data?.data

  const cards = [
    { title: 'Tổng số sách', value: stats?.totalBooks ?? '-', icon: '📚' },
    { title: 'Người dùng', value: stats?.totalUsers ?? '-', icon: '👥' },
    { title: 'Đang mượn', value: stats?.activeBorrows ?? '-', icon: '📖' },
    { title: 'Quá hạn', value: stats?.overdueBooks ?? '-', icon: '⚠️' },
    { title: 'Danh mục', value: stats?.totalCategories ?? '-', icon: '🏷️' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Tổng quan hệ thống thư viện</p>
      </div>

      {isLoading ? (
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
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <span className="text-xl">{card.icon}</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
