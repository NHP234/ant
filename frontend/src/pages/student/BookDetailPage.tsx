import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookApi } from '@/api/books'
import { borrowApi } from '@/api/borrows'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookApi.getById(Number(id)),
    enabled: !!id,
  })

  const borrowMutation = useMutation({
    mutationFn: () => borrowApi.borrow(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      toast.success('Mượn sách thành công!')
      navigate('/my-borrows')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Mượn sách thất bại')
    },
  })

  const book = data?.data?.data

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!book) {
    return <div className="text-center py-12 text-muted-foreground">Không tìm thấy sách</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>← Quay lại</Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{book.title}</CardTitle>
          <p className="text-lg text-muted-foreground">{book.author}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {book.categories?.map((c) => (
              <Badge key={c.id} variant="secondary">{c.name}</Badge>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {book.isbn && (
              <div><span className="text-muted-foreground">ISBN:</span> {book.isbn}</div>
            )}
            {book.publisher && (
              <div><span className="text-muted-foreground">NXB:</span> {book.publisher}</div>
            )}
            {book.publishYear && (
              <div><span className="text-muted-foreground">Năm XB:</span> {book.publishYear}</div>
            )}
            <div>
              <span className="text-muted-foreground">Tổng số:</span> {book.quantity} cuốn
            </div>
          </div>

          <Separator />

          {book.description && (
            <div>
              <h4 className="font-medium mb-2">Mô tả</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{book.description}</p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Badge variant={book.availableQuantity > 0 ? 'default' : 'destructive'} className="text-sm">
                {book.availableQuantity > 0 ? `Còn ${book.availableQuantity} cuốn` : 'Hết sách'}
              </Badge>
            </div>
            <Button
              size="lg"
              disabled={book.availableQuantity === 0 || borrowMutation.isPending}
              onClick={() => borrowMutation.mutate()}
            >
              {borrowMutation.isPending ? 'Đang xử lý...' : 'Mượn sách'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
