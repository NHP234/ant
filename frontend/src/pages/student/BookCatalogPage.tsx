import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookApi, categoryApi } from '@/api/books'
import type { Book, Category } from '@/api/books'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import BookCover from '@/components/shared/BookCover'
import { Search } from 'lucide-react'

// --- CÁC COMPONENT PHỤ TRỢ (SUB-COMPONENTS) ---

function BookCard({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.id}`} className="block h-full group">
      <Card className="h-full border-0 shadow-none bg-transparent flex flex-col group">
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-stone-100 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
          <BookCover
            src={book.coverImageUrl}
            title={book.title}
            imgClassName="transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="border border-border/50 text-lg"
          />
          {book.availableCopies === 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="shadow-sm bg-red-600/90 hover:bg-red-600">Hết</Badge>
            </div>
          )}
        </div>
        <div className="pt-3 flex flex-col flex-grow">
          <h3 className="font-heading font-semibold text-base leading-tight line-clamp-2 text-foreground mb-1 group-hover:text-primary transition-colors">{book.title}</h3>
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
  if (!isLoading && (!books || books.length === 0)) return null;

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-2xl font-heading font-bold">{title}</h2>
      </div>
      {isLoading ? (
        <BookCarouselSkeleton />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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

function CategoryCarouselSection({ category }: { category: Category }) {
  const { data, isLoading } = useQuery({
    queryKey: ['books', 'category', category.id],
    queryFn: () => bookApi.getByCategory(category.id, 0, 10),
    staleTime: 5 * 60 * 1000,
  })
  return <BookCarousel title={`Sách ${category.name}`} books={data?.data?.data?.content} isLoading={isLoading} />
}

// --- TRANG CHÍNH (MAIN PAGE) ---

export default function BookCatalogPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Fetch New Arrivals for Homepage
  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ['books', 'latest'],
    queryFn: () => bookApi.getAll(0, 10),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch Categories for Homepage Sections
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  // Fetch Search Results (only if search is active)
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
  const categories = categoriesData?.data?.data?.slice(0, 4) || [] // Show top 4 categories
  const searchResults = searchData?.data?.data

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-heading font-bold tracking-tight text-primary-900 dark:text-primary-100">Khám Phá</h2>
        </div>
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm sách, tác giả..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9 bg-card border-border/60 shadow-sm rounded-full"
          />
        </div>
      </div>

      {search ? (
        /* --- TÌM KIẾM SÁCH (GRID VIEW) --- */
        <div className="space-y-6 animate-in fade-in duration-500">
          <h3 className="text-xl font-heading font-semibold">Kết quả tìm kiếm cho "{search}"</h3>
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
                ← Trước
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Trang {page + 1} / {searchResults.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= searchResults.totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Sau →
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* --- HOMEPAGE CATALOG (APPLE BOOKS STYLE) --- */
        <div className="space-y-10 animate-in fade-in duration-700">
          
          {/* Hero Banner */}
          {latestLoading ? (
             <div className="w-full h-[400px] bg-muted animate-pulse rounded-2xl" />
          ) : featuredBook && (
            <section className="relative overflow-hidden rounded-3xl bg-stone-900 text-stone-50 shadow-2xl">
              {featuredBook.coverImageUrl && (
                 <div 
                   className="absolute inset-0 opacity-20 blur-2xl scale-110 bg-cover bg-center" 
                   style={{ backgroundImage: `url(${featuredBook.coverImageUrl})` }} 
                 />
              )}
              <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center p-8 md:p-12">
                <div className="space-y-6 order-2 md:order-1">
                  <Badge variant="outline" className="border-stone-500 text-stone-300 uppercase tracking-widest font-semibold bg-stone-900/50 backdrop-blur-sm">
                    Sách Nổi Bật
                  </Badge>
                  <div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-2">{featuredBook.title}</h2>
                    <p className="text-xl text-stone-400 font-serif italic">{featuredBook.author}</p>
                  </div>
                  <p className="text-stone-300 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-lg">
                    {featuredBook.description || "Một tác phẩm đáng chú ý đang chờ bạn khám phá trong thư viện. Đặt mượn ngay hôm nay để không bỏ lỡ."}
                  </p>
                  <Button size="lg" asChild className="rounded-full bg-stone-100 text-stone-900 hover:bg-white hover:scale-105 transition-transform shadow-xl">
                    <Link to={`/books/${featuredBook.id}`}>Khám phá ngay</Link>
                  </Button>
                </div>
                <div className="order-1 md:order-2 flex justify-center md:justify-end">
                  <div className="w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl transform md:rotate-2 hover:rotate-0 transition-transform duration-500 border border-stone-700/50">
                    <BookCover
                      src={featuredBook.coverImageUrl}
                      title={featuredBook.title}
                      loading="eager"
                      fallbackClassName="bg-stone-800 text-lg"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* New Arrivals Carousel */}
          <BookCarousel title="Mới Bổ Sung" books={carouselBooks} isLoading={latestLoading} />

          {/* Dynamic Category Carousels */}
          {categories.map(category => (
            <CategoryCarouselSection key={category.id} category={category} />
          ))}

        </div>
      )}
    </div>
  )
}
