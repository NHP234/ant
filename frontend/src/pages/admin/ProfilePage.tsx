import { useQuery } from '@tanstack/react-query'
import { userApi } from '@/api/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => userApi.getMyProfile(),
  })

  const user = data?.data?.data

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">Không tìm thấy thông tin</div>
  }

  const fields = [
    { label: 'Tên đăng nhập', value: user.username },
    { label: 'Email', value: user.email },
    { label: 'Họ và tên', value: user.fullName },
    { label: 'Vai trò', value: user.role === 'ADMIN' ? 'Quản trị viên' : user.role === 'LIBRARIAN' ? 'Thủ thư' : 'Sinh viên' },
    { label: 'Mã sinh viên', value: user.studentId || '—' },
    { label: 'Trạng thái', value: user.isActive ? 'Hoạt động' : 'Đã khóa' },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Thông tin cá nhân</h2>
        <p className="text-muted-foreground">Xem thông tin tài khoản của bạn</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, i) => (
            <div key={field.label}>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">{field.label}</span>
                <span className="text-sm font-medium">{field.value}</span>
              </div>
              {i < fields.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
