import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Library } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      await register({
        username: formData.get('username') as string,
        password: formData.get('password') as string,
        email: formData.get('email') as string,
        fullName: formData.get('fullName') as string,
        studentId: formData.get('studentId') as string || undefined,
      })
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Library className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Awaken Ant</h1>
          <p className="text-sm text-muted-foreground mt-1">Tạo tài khoản mới</p>
        </div>

        <Card className="border-border/50 shadow-xl rounded-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Đăng ký</CardTitle>
            <CardDescription>Điền thông tin để tạo tài khoản sinh viên</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" name="fullName" required autoFocus className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input id="username" name="username" required className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Mã sinh viên</Label>
                <Input id="studentId" name="studentId" placeholder="Không bắt buộc" className="rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input id="password" name="password" type="password" required minLength={6} className="rounded-lg" />
              </div>
              <Button type="submit" className="w-full rounded-lg h-11" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </Button>
              <p className="text-center text-sm text-muted-foreground pt-2">
                Đã có tài khoản?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Đăng nhập
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
