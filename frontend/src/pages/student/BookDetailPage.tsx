import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
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
import { useCarouselScroll } from '@/hooks/useCarouselScroll'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, BookOpen, Hash, Building2, Calendar } from 'lucide-react'

function BookDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pt-8 px-4">
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      <div className="grid md:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
        <div className="aspect-[2/3] w-full max-w-sm mx-auto bg-muted rounded-2xl animate-pulse shadow-2xl" />
        <div className="space-y-6 pt-4">
          <div className="h-10 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
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
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
          <BookCover
            src={book.coverImageUrl}
            title={book.title}
            imgClassName="transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="text-sm"
          />
        </div>
        <div className="pt-3 flex flex-col flex-grow text-center">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">{book.author}</p>
        </div>
      </Card>
    </Link>
  )
}

function SimilarBooksCarousel({ books }: { books: Book[] }) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll, checkScroll } = useCarouselScroll()

  useEffect(() => {
    if (books.length > 0) {
      const t = setTimeout(checkScroll, 100)
      return () => clearTimeout(t)
    }
  }, [books, checkScroll])

  return (
    <div className="pt-16 mt-16 border-t border-border/40">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Sách tương tự</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border/60 disabled:opacity-0 transition-opacity"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-border/60 disabled:opacity-0 transition-opacity"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar"
      >
        {books.map((sb) => (
          <div key={sb.id} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] snap-start">
            <SimilarBookCard book={sb} />
          </div>
        ))}
      </div>
    </div>
  )
}


export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isStudent } = useAuth()

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
  if (!book) return <div className="text-center py-32 text-muted-foreground text-xl">Không tìm thấy cuốn sách này trong thư viện.</div>

  return (
    <div className="relative min-h-screen pb-20 animate-in fade-in duration-500">
      
      {/* Blurred Background Hero Effect */}
      <div className="absolute top-0 inset-x-0 h-[50vh] overflow-hidden -z-10 bg-background">
        {book.coverImageUrl && (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10 blur-3xl scale-110"
              style={{ backgroundImage: `url(${book.coverImageUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-muted-foreground hover:text-foreground rounded-full pl-3">
          <ChevronLeft className="mr-1 h-5 w-5" /> Trở về
        </Button>

        <div className="grid md:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
          
          {/* Left Column: Cover & Action */}
          <div className="space-y-6 flex flex-col items-center md:items-start">
            <div className="relative aspect-[2/3] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50 group">
              <BookCover
                src={book.coverImageUrl}
                title={book.title}
                loading="eager"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
                fallbackClassName="p-8 text-2xl"
              />
            </div>

            <Card className="w-full max-w-sm bg-card/60 backdrop-blur-xl border-border/50 shadow-sm">
              <CardContent className="p-6 text-center space-y-4">
                 <div className="flex flex-col items-center gap-1">
                   <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</span>
                   <Badge
                     variant={book.availableCopies > 0 ? 'default' : 'destructive'}
                     className={`text-base px-4 py-1.5 shadow-none border-0 ${book.availableCopies > 0 ? 'bg-success/15 text-success dark:bg-success/20' : ''}`}
                   >
                     {book.availableCopies > 0 ? `Sẵn sàng (${book.availableCopies} cuốn)` : 'Đã mượn hết'}
                   </Badge>
                 </div>
                 {isStudent ? (
                   <Button
                      size="lg"
                      data-testid="book-hold-button"
                      className="w-full rounded-full shadow-md hover:scale-[1.02] transition-transform text-md h-12"
                      disabled={book.availableCopies === 0 || holdMutation.isPending}
                      onClick={() => holdMutation.mutate()}
                    >
                      {holdMutation.isPending ? 'Đang xử lý...' : 'Đặt mượn (giữ 24h)'}
                    </Button>
                 ) : (
                   <div
                     className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
                     data-testid="book-hold-staff-readonly"
                   >
                     Chỉ sinh viên được đặt mượn trên web. Nhân viên đang xem kho sách ở chế độ đọc.
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details */}
          <div className="space-y-8 pt-2">
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {book.categories?.map((c) => (
                  <Badge key={c.id} variant="secondary" className="font-medium text-xs px-3 py-1 uppercase tracking-wider border-0">
                    {c.name}
                  </Badge>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight">{book.title}</h1>
              <p className="text-lg text-muted-foreground mt-3">{book.author}</p>
            </div>

            <Separator className="bg-border/40" />

            {/* Description */}
            {book.description && (
              <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-line">
                {book.description}
              </p>
            )}

            {/* Metadata */}
            <div className="bg-muted/50 rounded-2xl p-6 md:p-8 border border-border/50">
              <h3 className="font-semibold text-lg mb-5">Thông tin xuất bản</h3>
              <div className="grid sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
                {book.publisher && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-0.5">Nhà xuất bản</span>
                      <strong className="text-foreground font-medium">{book.publisher}</strong>
                    </div>
                  </div>
                )}
                {book.publishYear && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-0.5">Năm xuất bản</span>
                      <strong className="text-foreground font-medium">{book.publishYear}</strong>
                    </div>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Hash className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs uppercase tracking-wider mb-0.5">ISBN</span>
                      <strong className="text-foreground font-medium">{book.isbn}</strong>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-muted-foreground">
                  <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider mb-0.5">Tổng bản sao</span>
                    <strong className="text-foreground font-medium">{book.totalCopies} cuốn</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Books */}
        {!similarLoading && similarBooks.length > 0 && (
          <SimilarBooksCarousel books={similarBooks} />
        )}
      </div>
    </div>
  )
}
