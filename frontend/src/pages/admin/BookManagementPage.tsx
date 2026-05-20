import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookApi, bookCopyApi, type Book, type BookCreateRequest, type BookCopy } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Copy, Plus, Trash2 } from 'lucide-react'

export default function BookManagementPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copyBookId, setCopyBookId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'books', page, search],
    queryFn: () => search
      ? bookApi.search(search, page, 10)
      : bookApi.getAll(page, 10),
  })

  const { data: copiesData } = useQuery({
    queryKey: ['admin', 'copies', copyBookId],
    queryFn: () => bookCopyApi.getCopies(copyBookId!),
    enabled: !!copyBookId,
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

  const addCopyMutation = useMutation({
    mutationFn: (bookId: number) => bookCopyApi.addCopy(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'copies', copyBookId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Thêm bản sao thành công')
    },
    onError: () => toast.error('Thêm bản sao thất bại'),
  })

  const deleteCopyMutation = useMutation({
    mutationFn: ({ bookId, copyId }: { bookId: number; copyId: number }) =>
      bookCopyApi.deleteCopy(bookId, copyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'copies', copyBookId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Đã xóa bản sao')
    },
    onError: () => toast.error('Xóa bản sao thất bại'),
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
      const { quantity, ...updatePayload } = payload
      updateMutation.mutate({ id: editingBook.id, data: updatePayload })
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

  const openCopies = (bookId: number) => {
    setCopyBookId(bookId)
    setCopyDialogOpen(true)
  }

  const copies = copiesData?.data?.data ?? []

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
                {!editingBook && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Số lượng bản sao</Label>
                    <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
                  </div>
                )}
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

      <div className="flex gap-2">
        <Input
          placeholder="Tìm kiếm sách..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên sách</TableHead>
              <TableHead>Tác giả</TableHead>
              <TableHead className="hidden md:table-cell">ISBN</TableHead>
              <TableHead className="text-center">Tổng</TableHead>
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
                  <TableCell className="text-center">{book.totalCopies}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'}>
                      {book.availableCopies}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {book.categories?.map(c => c.name).join(', ') || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => openCopies(book.id)}>
                      Bản sao
                    </Button>
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

      <Dialog open={copyDialogOpen} onOpenChange={(open) => { setCopyDialogOpen(open); if (!open) setCopyBookId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quản lý bản sao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{copies.length} bản sao</p>
              <Button size="sm" onClick={() => copyBookId && addCopyMutation.mutate(copyBookId)} disabled={addCopyMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Thêm bản sao
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>NFC Tag</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {copies.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Chưa có bản sao nào</TableCell></TableRow>
                ) : (
                  copies.map((copy) => (
                    <TableRow key={copy.id}>
                      <TableCell className="font-medium">{copy.copyNumber}</TableCell>
                      <TableCell>
                        <Badge variant={copy.status === 'AVAILABLE' ? 'default' : copy.status === 'BORROWED' ? 'secondary' : 'destructive'}>
                          {copy.status === 'AVAILABLE' ? 'Có sẵn' : copy.status === 'BORROWED' ? 'Đang mượn' : copy.status === 'RESERVED' ? 'Giữ chỗ' : copy.status === 'DAMAGED' ? 'Hư hỏng' : 'Mất'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{copy.nfcTagUid || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive"
                          onClick={() => { if (confirm('Xóa bản sao này?')) deleteCopyMutation.mutate({ bookId: copy.bookId, copyId: copy.id }) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
