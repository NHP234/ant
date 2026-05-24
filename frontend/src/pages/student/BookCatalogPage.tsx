import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { bookApi } from '@/api/books'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BookCatalogPage() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['books', 'catalog', page, search],
    queryFn: () => search
      ? bookApi.search(search, page, 12)
      : bookApi.getAll(page, 12),
  })

  const books = data?.data?.data

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(0)
    }, 300)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Duyệt sách</h2>
        <p className="text-muted-foreground">Tìm và mượn sách từ thư viện</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Tìm kiếm theo tên, tác giả..."
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          className="max-w-sm"
        />
        {search && (
          <Button variant="ghost" onClick={() => { setSearch(''); setSearchInput(''); setPage(0) }}>
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="h-3 w-1/4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !books?.content?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? `Không tìm thấy sách cho "${search}"` : 'Chưa có sách nào trong thư viện'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.content.map((book) => (
            <Link key={book.id} to={`/books/${book.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {book.categories?.slice(0, 2).map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2">
                    <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'}>
                      {book.availableCopies > 0 ? `Còn ${book.availableCopies} cuốn` : 'Hết sách'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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
