import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { bookApi } from '@/api/books'
import type { Book } from '@/api/books'
import { holdApi } from '@/api/holds'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import BookCover from '@/components/shared/BookCover'
import { toast } from 'sonner'
import { ChevronLeft, BookOpen, Hash, Building2, Calendar, Quote } from 'lucide-react'

function BookDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pt-8 px-4">
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      <div className="grid md:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
        <div className="aspect-[2/3] w-full max-w-sm mx-auto bg-muted rounded-2xl animate-pulse shadow-2xl" />
        <div className="space-y-6 pt-4">
          <div className="h-12 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-8 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
          <div className="h-px w-full bg-border/50 my-8" />
          <div className="grid grid-cols-2 gap-4">
             <div className="h-6 w-full bg-muted rounded animate-pulse" />
             <div className="h-6 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="h-32 bg-muted rounded-xl animate-pulse mt-8" />
        </div>
      </div>
    </div>
  )
}

function SimilarBookCard({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.id}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="block group h-full">
      <Card className="h-full border-0 shadow-none bg-transparent flex flex-col group">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-stone-100 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
          <BookCover
            src={book.coverImageUrl}
            title={book.title}
            imgClassName="transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="text-sm"
          />
        </div>
        <div className="pt-3 flex flex-col flex-grow text-center">
          <h3 className="font-heading font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">{book.author}</p>
        </div>
      </Card>
    </Link>
  )
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: bookData, isLoading: bookLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookApi.getById(Number(id)),
    enabled: !!id,
  })

  const { data: similarData, isLoading: similarLoading } = useQuery({
    queryKey: ['book', id, 'similar'],
    queryFn: () => bookApi.getSimilar(Number(id), 0, 5),
    enabled: !!id,
  })

  const holdMutation = useMutation({
    mutationFn: () => holdApi.create({ bookId: Number(id) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] })
      toast.success('Đặt mượn thành công! Bạn có 24h để đến thư viện nhận sách.')
      navigate('/my-borrows')
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Đặt mượn thất bại')
    },
  })

  const book = bookData?.data?.data
  const similarBooks = similarData?.data?.data?.content || []

  if (bookLoading) return <BookDetailSkeleton />
  if (!book) return <div className="text-center py-32 text-muted-foreground text-xl font-heading">Không tìm thấy cuốn sách này trong thư viện.</div>

  return (
    <div className="relative min-h-screen pb-20 animate-in fade-in duration-700">
      
      {/* Blurred Background Hero Effect (Glassmorphism) */}
      <div className="absolute top-0 inset-x-0 h-[50vh] overflow-hidden -z-10 bg-background">
        {book.coverImageUrl && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20 blur-3xl scale-110"
              style={{ backgroundImage: `url(${book.coverImageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Navigation */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-muted-foreground hover:text-foreground hover:bg-stone-200/50 dark:hover:bg-stone-800/50 backdrop-blur-md rounded-full pl-3">
          <ChevronLeft className="mr-1 h-5 w-5" /> Trở về
        </Button>

        {/* Main Content */}
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          
          {/* Left Column: Cover Image & Status */}
          <div className="space-y-6 flex flex-col items-center md:items-start">
            <div className="relative aspect-[2/3] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50 group">
              <BookCover
                src={book.coverImageUrl}
                title={book.title}
                loading="eager"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
                fallbackClassName="p-8 text-3xl"
              />
            </div>

            <Card className="w-full max-w-sm bg-card/60 backdrop-blur-xl border-border/50 shadow-sm">
              <CardContent className="p-6 text-center space-y-4">
                 <div className="flex flex-col items-center gap-1">
                   <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</span>
                   <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'} className={`text-base px-4 py-1.5 shadow-none border-0 ${book.availableCopies > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : ''}`}>
                     {book.availableCopies > 0 ? `Sẵn sàng (${book.availableCopies} cuốn)` : 'Đã mượn hết'}
                   </Badge>
                 </div>
                 <Button
                    size="lg"
                    className="w-full rounded-full shadow-md hover:scale-[1.02] transition-transform text-md h-12"
                    disabled={book.availableCopies === 0 || holdMutation.isPending}
                    onClick={() => holdMutation.mutate()}
                  >
                    {holdMutation.isPending ? 'Đang xử lý...' : 'Đặt mượn ngay (Giữ 24h)'}
                  </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Book Details */}
          <div className="space-y-8 pt-2">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {book.categories?.map((c) => (
                  <Badge key={c.id} variant="secondary" className="font-medium bg-stone-200/50 dark:bg-stone-800/50 hover:bg-stone-300/50 backdrop-blur-sm text-xs px-3 py-1 uppercase tracking-wider text-stone-600 dark:text-stone-300 border-0">
                    {c.name}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground leading-[1.1] tracking-tight">{book.title}</h1>
              <p className="text-2xl font-serif italic text-muted-foreground mt-4">{book.author}</p>
            </div>

            <Separator className="bg-border/40" />

            {/* Editorial Description / Quote */}
            {book.description && (
              <div className="relative">
                <Quote className="absolute -top-4 -left-6 h-16 w-16 text-stone-200 dark:text-stone-800 -z-10 rotate-180 opacity-50" />
                <p className="text-lg md:text-xl font-serif text-foreground/90 leading-relaxed whitespace-pre-line relative z-10 drop-shadow-sm">
                  {book.description}
                </p>
              </div>
            )}

            {/* Metadata Section */}
            <div className="bg-stone-50/50 dark:bg-stone-900/30 rounded-2xl p-6 md:p-8 backdrop-blur-sm border border-stone-200/50 dark:border-stone-800/50">
              <h3 className="font-heading font-semibold text-xl mb-6">Thông tin xuất bản</h3>
              <div className="grid sm:grid-cols-2 gap-y-6 gap-x-8 text-base">
                {book.publisher && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Building2 className="h-5 w-5 shrink-0 mt-0.5 text-stone-400" />
                    <div>
                      <span className="block text-sm">Nhà xuất bản</span>
                      <strong className="text-foreground font-medium">{book.publisher}</strong>
                    </div>
                  </div>
                )}
                {book.publishYear && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Calendar className="h-5 w-5 shrink-0 mt-0.5 text-stone-400" />
                    <div>
                      <span className="block text-sm">Năm xuất bản</span>
                      <strong className="text-foreground font-medium">{book.publishYear}</strong>
                    </div>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Hash className="h-5 w-5 shrink-0 mt-0.5 text-stone-400" />
                    <div>
                      <span className="block text-sm">ISBN</span>
                      <strong className="text-foreground font-medium">{book.isbn}</strong>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-muted-foreground">
                  <BookOpen className="h-5 w-5 shrink-0 mt-0.5 text-stone-400" />
                  <div>
                    <span className="block text-sm">Tổng bản sao thư viện</span>
                    <strong className="text-foreground font-medium">{book.totalCopies} cuốn</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Similar Books Section */}
        {!similarLoading && similarBooks.length > 0 && (
          <div className="pt-20 mt-16 border-t border-border/40">
            <h2 className="text-3xl font-heading font-bold mb-8 text-center md:text-left">Độc giả cũng mượn</h2>
            <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
              {similarBooks.map((sb) => (
                <div key={sb.id} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] snap-start">
                  <SimilarBookCard book={sb} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
