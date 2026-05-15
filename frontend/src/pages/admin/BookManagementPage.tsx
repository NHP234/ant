import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookApi, type Book, type BookCreateRequest } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

export default function BookManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'books', page, search],
    queryFn: () => search
      ? bookApi.search(search, page, 10)
      : bookApi.getAll(page, 10),
  })


  const deleteMutation = useMutation({
    mutationFn: (id: number) => bookApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Đã xóa sách')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const createMutation = useMutation({
    mutationFn: (data: BookCreateRequest) => bookApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      setDialogOpen(false)
      toast.success('Thêm sách thành công')
    },
    onError: () => toast.error('Thêm sách thất bại'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BookCreateRequest> }) =>
      bookApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      setDialogOpen(false)
      setEditingBook(null)
      toast.success('Cập nhật thành công')
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })

  const books = data?.data?.data

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload: BookCreateRequest = {
      title: form.get('title') as string,
      author: form.get('author') as string,
      isbn: form.get('isbn') as string || undefined,
      publisher: form.get('publisher') as string || undefined,
      publishYear: form.get('publishYear') ? Number(form.get('publishYear')) : undefined,
      description: form.get('description') as string || undefined,
      quantity: Number(form.get('quantity')) || 1,
    }

    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openEdit = (book: Book) => {
    setEditingBook(book)
    setDialogOpen(true)
  }

  const openCreate = () => {
    setEditingBook(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý sách</h2>
          <p className="text-muted-foreground">{books?.totalElements ?? 0} cuốn sách trong hệ thống</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ Thêm sách</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBook ? 'Sửa sách' : 'Thêm sách mới'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tên sách *</Label>
                <Input id="title" name="title" required defaultValue={editingBook?.title ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Tác giả *</Label>
                <Input id="author" name="author" required defaultValue={editingBook?.author ?? ''} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" name="isbn" defaultValue={editingBook?.isbn ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Số lượng</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} defaultValue={editingBook?.quantity ?? 1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publisher">Nhà xuất bản</Label>
                  <Input id="publisher" name="publisher" defaultValue={editingBook?.publisher ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishYear">Năm XB</Label>
                  <Input id="publishYear" name="publishYear" type="number" defaultValue={editingBook?.publishYear ?? ''} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                  defaultValue={editingBook?.description ?? ''}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingBook ? 'Cập nhật' : 'Thêm sách'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Tìm kiếm sách..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên sách</TableHead>
              <TableHead>Tác giả</TableHead>
              <TableHead className="hidden md:table-cell">ISBN</TableHead>
              <TableHead className="text-center">SL</TableHead>
              <TableHead className="text-center">Còn</TableHead>
              <TableHead className="hidden md:table-cell">Danh mục</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : !books?.content?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có sách nào</TableCell></TableRow>
            ) : (
              books.content.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{book.isbn || '-'}</TableCell>
                  <TableCell className="text-center">{book.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={book.availableQuantity > 0 ? 'default' : 'destructive'}>
                      {book.availableQuantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {book.categories?.map(c => c.name).join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(book)}>Sửa</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => { if (confirm('Xóa sách này?')) deleteMutation.mutate(book.id) }}
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

      {/* Pagination */}
      {books && books.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page + 1} / {books.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= books.totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Sau →
          </Button>
        </div>
      )}
    </div>
  )
}
