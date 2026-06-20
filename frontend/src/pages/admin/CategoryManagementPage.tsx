import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryApi, type Category } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import PageHeader from '@/components/shared/PageHeader'
import Pagination from '@/components/shared/Pagination'

const PAGE_SIZE = 20

export default function CategoryManagementPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['categories', page, PAGE_SIZE],
    queryFn: () => categoryApi.getPage(page, PAGE_SIZE),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => categoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setPage(0)
      setDialogOpen(false)
      toast.success('Thêm danh mục thành công')
    },
    onError: () => toast.error('Thêm thất bại'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string } }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDialogOpen(false)
      setEditingCategory(null)
      toast.success('Cập nhật thành công')
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (categories.length === 1 && page > 0) {
        setPage(page - 1)
      }
      toast.success('Đã xóa danh mục')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const categoryPage = data?.data?.data
  const categories = categoryPage?.content ?? []
  const totalCategories = categoryPage?.totalElements ?? 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = {
      name: form.get('name') as string,
      description: form.get('description') as string || undefined,
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openEdit = (category: Category) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý danh mục"
        description={`${totalCategories} danh mục sách`}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>Thêm danh mục</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên danh mục *</Label>
                  <Input id="name" name="name" required defaultValue={editingCategory?.name ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    defaultValue={editingCategory?.description ?? ''}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCategory ? 'Cập nhật' : 'Thêm danh mục'}
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
              <TableHead>ID</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden md:table-cell">Mô tả</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !categories.length ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có danh mục nào</TableCell></TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="text-muted-foreground">{category.id}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[300px] truncate">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>Sửa</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => { if (confirm('Xóa danh mục này?')) deleteMutation.mutate(category.id) }}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {categoryPage && categoryPage.totalPages > 1 && (
        <Pagination
          page={categoryPage.page}
          totalPages={categoryPage.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
