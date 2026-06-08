import { useState, useRef, useEffect } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookApi, categoryApi } from '@/api/books'
import type { Book } from '@/api/books'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import BookCover from '@/components/shared/BookCover'
import PageHeader from '@/components/shared/PageHeader'
import { useCarouselScroll } from '@/hooks/useCarouselScroll'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORY_SCAN_LIMIT = 24
const CATEGORY_SECTION_LIMIT = 6

function BookCard({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.id}`} className="block h-full group">
      <Card className="h-full border-0 shadow-none bg-transparent flex flex-col group">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
          <BookCover
            src={book.coverImageUrl}
            title={book.title}
            imgClassName="transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="border border-border/50 text-lg"
          />
          {book.availableCopies === 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="shadow-sm">Hết</Badge>
            </div>
          )}
        </div>
        <div className="pt-3 flex flex-col flex-grow">
          <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground mb-1 group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-sm text-muted-foreground truncate">{book.author}</p>
        </div>
      </Card>
    </Link>
  )
}

function BookCarouselSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-none w-[160px] sm:w-[180px] space-y-3">
          <div className="aspect-[2/3] w-full bg-muted animate-pulse rounded-md" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

function BookCarousel({ title, books, isLoading }: { title: string, books?: Book[], isLoading?: boolean }) {
  const { scrollRef, canScrollLeft, canScrollRight, scroll, checkScroll } = useCarouselScroll()

  // Re-check scroll bounds when books data changes
  useEffect(() => {
    if (books && books.length > 0) {
      // Small delay to let DOM render new items
      const t = setTimeout(checkScroll, 100)
      return () => clearTimeout(t)
    }
  }, [books, checkScroll])

  if (!isLoading && (!books || books.length === 0)) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold">{title}</h2>
        {!isLoading && (
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
        )}
      </div>
      {isLoading ? (
        <BookCarouselSkeleton />
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar"
        >
          {books?.map((book) => (
            <div key={book.id} className="flex-none w-[150px] sm:w-[180px] md:w-[200px] snap-start">
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function BookCatalogPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ['books', 'latest'],
    queryFn: () => bookApi.getAll(0, 10),
    staleTime: 5 * 60 * 1000,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
    staleTime: 60 * 60 * 1000,
  })

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['books', 'search', page, search],
    queryFn: () => bookApi.search(search, page, 12),
    enabled: !!search,
  })

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(0)
    }, 300)
  }

  const latestBooks = latestData?.data?.data?.content || []
  const featuredBook = latestBooks.length > 0 ? latestBooks[0] : null
  const carouselBooks = latestBooks.slice(1)
  const categoryCandidates = categoriesData?.data?.data?.slice(0, CATEGORY_SCAN_LIMIT) || []
  const categoryBookQueries = useQueries({
    queries: categoryCandidates.map((category) => ({
      queryKey: ['books', 'category', category.id],
      queryFn: () => bookApi.getByCategory(category.id, 0, 10),
      staleTime: 5 * 60 * 1000,
      enabled: !search,
    })),
  })
  const searchResults = searchData?.data?.data
  const categorySections = categoryCandidates
    .map((category, index) => ({
      category,
      books: categoryBookQueries[index]?.data?.data?.data?.content,
      isLoading: categoryBookQueries[index]?.isLoading,
    }))
    .filter((section) => section.isLoading || (section.books?.length ?? 0) > 0)
    .slice(0, CATEGORY_SECTION_LIMIT)

  const searchBar = (
    <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder="Tìm kiếm sách, tác giả..."
        value={searchInput}
        onChange={(e) => handleSearchInput(e.target.value)}
        className="pl-9 bg-card border-border/60 shadow-sm rounded-full"
      />
    </div>
  )

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="Khám phá" actions={searchBar} />

      {search ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-lg font-semibold">Kết quả tìm kiếm cho "{search}"</h3>
          {searchLoading ? (
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
               {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[2/3] w-full bg-muted animate-pulse rounded-md" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : !searchResults?.content?.length ? (
            <div className="text-center py-20 text-muted-foreground">
              Không tìm thấy cuốn sách nào phù hợp.
            </div>
          ) : (
            <div className="grid gap-x-4 gap-y-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {searchResults.content.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {searchResults && searchResults.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-8">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Trước
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Trang {page + 1} / {searchResults.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= searchResults.totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Sau
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in duration-500">
          
          {/* Hero Banner */}
          {latestLoading ? (
             <div className="w-full h-[400px] bg-muted animate-pulse rounded-2xl" />
          ) : featuredBook && (
            <section className="relative overflow-hidden rounded-2xl bg-foreground text-background shadow-2xl">
              {featuredBook.coverImageUrl && (
                 <div 
                    className="absolute inset-0 opacity-20 blur-2xl scale-110 bg-cover bg-center" 
                    style={{ backgroundImage: `url(${featuredBook.coverImageUrl})` }} 
                  />
              )}
              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center p-8 md:p-12">
                <div className="space-y-5 order-2 md:order-1">
                  <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground uppercase tracking-widest font-semibold text-[11px]">
                    Nổi bật
                  </Badge>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{featuredBook.title}</h2>
                    <p className="text-lg text-muted-foreground">{featuredBook.author}</p>
                  </div>
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed max-w-lg">
                    {featuredBook.description || "Một tác phẩm đáng chú ý đang chờ bạn khám phá trong thư viện."}
                  </p>
                  <Button size="lg" asChild className="rounded-full shadow-lg">
                    <Link to={`/books/${featuredBook.id}`}>Xem chi tiết</Link>
                  </Button>
                </div>
                <div className="order-1 md:order-2 flex justify-center md:justify-end">
                  <div className="w-48 md:w-56 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-border/20">
                    <BookCover
                      src={featuredBook.coverImageUrl}
                      title={featuredBook.title}
                      loading="eager"
                      fallbackClassName="text-lg"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          <BookCarousel title="Mới bổ sung" books={carouselBooks} isLoading={latestLoading} />

          {categorySections.map(({ category, books, isLoading }) => (
            <BookCarousel key={category.id} title={category.name} books={books} isLoading={isLoading} />
          ))}
        </div>
      )}
    </div>
  )
}
