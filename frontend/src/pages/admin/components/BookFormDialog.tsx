import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { bookApi, categoryApi, type Book, type BookCreateRequest } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface BookFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBook: Book | null
  onEditingChange: (book: Book | null) => void
}

export default function BookFormDialog({ open, onOpenChange, editingBook, onEditingChange }: BookFormDialogProps) {
  const queryClient = useQueryClient()
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([])
  const [catSearch, setCatSearch] = useState('')

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => categoryApi.getAll(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const categories = categoriesResponse?.data?.data || []
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  )

  useEffect(() => {
    if (open) {
      if (editingBook) {
        setSelectedCatIds(editingBook.categories?.map((c) => c.id) || [])
      } else {
        setSelectedCatIds([])
      }
      setCatSearch('')
    }
  }, [editingBook, open])

  const createMutation = useMutation({
    mutationFn: (data: BookCreateRequest) => bookApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      onOpenChange(false)
      toast.success('Thêm sách thành công')
    },
    onError: () => toast.error('Thêm sách thất bại'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BookCreateRequest> }) =>
      bookApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      onOpenChange(false)
      onEditingChange(null)
      toast.success('Cập nhật thành công')
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })

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
      coverImageUrl: form.get('coverImageUrl') as string || undefined,
      categoryIds: selectedCatIds,
      quantity: Number(form.get('quantity')) || 1,
    }

    if (editingBook) {
      const { quantity, ...updatePayload } = payload
      updateMutation.mutate({ id: editingBook.id, data: updatePayload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open)
    if (!open) onEditingChange(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>+ Thêm sách</Button>
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
            <Label htmlFor="coverImageUrl">Đường dẫn ảnh bìa (URL)</Label>
            <Input id="coverImageUrl" name="coverImageUrl" defaultValue={editingBook?.coverImageUrl ?? ''} />
          </div>
          <div className="space-y-2">
            <Label>Danh mục sách</Label>
            <Input
              placeholder="Tìm kiếm danh mục..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-md p-2 h-36 overflow-y-auto space-y-1">
              {filteredCategories.length === 0 ? (
                <div className="text-xs text-muted-foreground p-1">Không tìm thấy danh mục nào</div>
              ) : (
                filteredCategories.map((c) => {
                  const isChecked = selectedCatIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className="flex items-center space-x-2 p-1 rounded hover:bg-muted cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedCatIds(selectedCatIds.filter((id) => id !== c.id))
                          } else {
                            setSelectedCatIds([...selectedCatIds, c.id])
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>{c.name}</span>
                    </label>
                  )
                })
              )}
            </div>
            {selectedCatIds.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Đã chọn: {selectedCatIds
                  .map((id) => categories.find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </div>
            )}
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
  )
}
