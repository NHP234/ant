import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { userApi, type CreateUserRequest } from '@/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import PageHeader from '@/components/shared/PageHeader'

export default function UserManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'LIBRARIAN' | 'ADMIN'>('STUDENT')
  const [renderedAt] = useState(() => Date.now())

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => userApi.getAll(page, 10),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setDialogOpen(false)
      toast.success('Tạo người dùng thành công')
    },
    onError: (err: AxiosError<{ message?: string }>) => toast.error(err.response?.data?.message || 'Tạo thất bại'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => userApi.updateStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Cập nhật trạng thái thành công')
    },
  })

  const clearHoldBanMutation = useMutation({
    mutationFn: (id: number) => userApi.clearHoldBan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Đã mở khóa đặt mượn')
    },
    onError: (err: AxiosError<{ message?: string }>) => toast.error(err.response?.data?.message || 'Mở khóa thất bại'),
  })

  const users = data?.data?.data

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    createMutation.mutate({
      username: form.get('username') as string,
      password: form.get('password') as string,
      email: form.get('email') as string,
      fullName: form.get('fullName') as string,
      studentId: form.get('studentId') as string || undefined,
      role: form.get('role') as string,
    })
  }

  const roleColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
    ADMIN: 'destructive',
    LIBRARIAN: 'default',
    STUDENT: 'secondary',
  }

  const isHoldBanActive = (holdBanUntil: string | null) =>
    Boolean(holdBanUntil && new Date(holdBanUntil).getTime() > renderedAt)

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý người dùng"
        description={`${users?.totalElements ?? 0} người dùng`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Thêm người dùng</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo người dùng mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên *</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập *</Label>
                  <Input id="username" name="username" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">
                    Mã sinh viên {selectedRole === 'STUDENT' ? '*' : ''}
                  </Label>
                  <Input
                    id="studentId"
                    name="studentId"
                    required={selectedRole === 'STUDENT'}
                    placeholder={selectedRole === 'STUDENT' ? 'VD: 20200001' : 'Không bắt buộc với nhân viên'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Quyền *</Label>
                  <select
                    name="role"
                    required
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value as 'STUDENT' | 'LIBRARIAN' | 'ADMIN')}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="STUDENT">Sinh viên</option>
                    <option value="LIBRARIAN">Thủ thư</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Tạo người dùng
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="hidden lg:table-cell">Đặt mượn</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !users?.content?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có người dùng</TableCell></TableRow>
            ) : (
              users.content.map((user) => {
                const holdBanActive = user.role === 'STUDENT' && isHoldBanActive(user.holdBanUntil)

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleColors[user.role] ?? 'secondary'}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {holdBanActive ? (
                        <div className="space-y-1">
                          <Badge variant="destructive">Đang khóa</Badge>
                          <div className="text-xs text-muted-foreground">
                            Đến {formatDateTime(user.holdBanUntil as string)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Bình thường</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {holdBanActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={clearHoldBanMutation.isPending}
                          onClick={() => clearHoldBanMutation.mutate(user.id)}
                        >
                          Mở khóa đặt mượn
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: user.id, active: !user.isActive })}
                      >
                        {user.isActive ? 'Khóa' : 'Mở'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {users && users.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {users.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= users.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
