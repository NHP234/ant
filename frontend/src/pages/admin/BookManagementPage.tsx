import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookApi, type Book } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import BookFormDialog from './components/BookFormDialog'
import CopiesDialog from './components/CopiesDialog'
import { useAuth } from '@/hooks/useAuth'

export default function BookManagementPage() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bookApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Đã xóa sách')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const books = data?.data?.data

  const openEdit = (book: Book) => {
    setEditingBook(book)
    setDialogOpen(true)
  }

  const openCopies = (bookId: number) => {
    setCopyBookId(bookId)
    setCopyDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quản lý sách</h2>
          <p className="text-muted-foreground">{books?.totalElements ?? 0} cuốn sách trong hệ thống</p>
        </div>
        <BookFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingBook={editingBook}
          onEditingChange={setEditingBook}
        />
      </div>

      <div className="flex gap-2">
        <Input
          data-testid="book-management-search"
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
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        data-testid={`delete-book-${book.id}`}
                        onClick={() => { if (confirm('Xóa sách này?')) deleteMutation.mutate(book.id) }}
                      >
                        Xóa
                      </Button>
                    )}
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

      <CopiesDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        bookId={copyBookId}
      />
    </div>
  )
}
