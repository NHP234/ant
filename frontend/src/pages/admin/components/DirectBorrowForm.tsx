import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getErrorDescription } from '@/lib/errorMessages'
import { borrowSlipApi } from '@/api/borrowSlips'
import { bookApi, bookCopyApi } from '@/api/books'
import type { Book, BookCopy } from '@/api/books'
import { userApi } from '@/api/users'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  ListPlus,
  Loader2,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

type IdentifierMode = 'studentId' | 'username'

const AUTO_COPY = 'AUTO'
const MAX_BORROW_ITEMS = 5

interface PendingBorrowItem {
  book: Book
  copyId?: number
  copyLabel: string
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function describeCopy(copy: BookCopy) {
  return `Bản sao #${copy.copyNumber}${copy.nfcTagUid ? ' (có nhãn NFC)' : ''}`
}

export default function DirectBorrowForm() {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>('studentId')
  const [identifier, setIdentifier] = useState('')
  const [bookSearch, setBookSearch] = useState('')
  const [selectedBookId, setSelectedBookId] = useState('')
  const [selectedCopyId, setSelectedCopyId] = useState(AUTO_COPY)
  const [manualCopyId, setManualCopyId] = useState('')
  const [pendingItems, setPendingItems] = useState<PendingBorrowItem[]>([])
  const [formError, setFormError] = useState('')

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'direct-borrow-identify'],
    queryFn: () => userApi.getAll(0, 200),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const bookSearchQuery = useQuery({
    queryKey: ['admin', 'books', 'direct-borrow-search', bookSearch],
    queryFn: () => bookApi.search(bookSearch.trim(), 0, 8),
    enabled: bookSearch.trim().length >= 2,
    staleTime: 30_000,
  })

  const copiesQuery = useQuery({
    queryKey: ['admin', 'books', Number(selectedBookId), 'copies'],
    queryFn: () => bookCopyApi.getCopies(Number(selectedBookId)),
    enabled: Boolean(selectedBookId),
  })

  const users = useMemo(() => usersQuery.data?.data?.data?.content ?? [], [usersQuery.data])
  const books = useMemo(() => bookSearchQuery.data?.data?.data?.content ?? [], [bookSearchQuery.data])
  const copies = useMemo(() => copiesQuery.data?.data?.data ?? [], [copiesQuery.data])
  const availableCopies = copies.filter(copy => copy.status === 'AVAILABLE')

  const matchingUsers = useMemo(() => {
    const term = normalize(identifier)
    if (!term) return []

    return users
      .filter(user => user.role === 'STUDENT')
      .filter(user => {
        const username = normalize(user.username)
        const studentId = normalize(user.studentId ?? '')
        const fullName = normalize(user.fullName)
        return username.includes(term) || studentId.includes(term) || fullName.includes(term)
      })
      .slice(0, 5)
  }, [identifier, users])

  const exactUser = useMemo(() => {
    const term = normalize(identifier)
    if (!term) return null

    return users.find(user => {
      if (identifierMode === 'username') {
        return normalize(user.username) === term
      }
      return normalize(user.studentId ?? '') === term
    }) ?? null
  }, [identifier, identifierMode, users])

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null
    return books.find(book => book.id === Number(selectedBookId)) ?? null
  }, [books, selectedBookId])

  const borrowMutation = useMutation({
    mutationFn: () =>
      borrowSlipApi.create({
        ...(identifierMode === 'username' ? { username: identifier.trim() } : { studentId: identifier.trim() }),
        source: 'COUNTER',
        items: pendingItems.map(item => ({
          bookId: item.book.id,
          ...(item.copyId ? { copyId: item.copyId } : {}),
        })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'borrow-slips'] })
      toast.success(`Đã tạo phiếu mượn gồm ${pendingItems.length} cuốn`)
      setIdentifier('')
      setBookSearch('')
      setSelectedBookId('')
      setSelectedCopyId(AUTO_COPY)
      setManualCopyId('')
      setPendingItems([])
      setFormError('')
    },
    onError: (error) => {
      setFormError(getErrorDescription(error))
    },
  })

  function resolveCopyId() {
    const manual = manualCopyId.trim()
    if (manual) {
      const parsed = Number(manual)
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('Mã bản sao phải là số nguyên dương.')
      }
      return parsed
    }

    if (selectedCopyId !== AUTO_COPY) {
      return Number(selectedCopyId)
    }

    return undefined
  }

  function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!identifier.trim()) {
      setFormError('Vui lòng nhập username hoặc MSSV của sinh viên.')
      return
    }

    if (!selectedBookId) {
      setFormError('Vui lòng chọn sách cần mượn.')
      return
    }

    if (pendingItems.length >= MAX_BORROW_ITEMS) {
      setFormError(`Mỗi phiếu chỉ được mượn tối đa ${MAX_BORROW_ITEMS} cuốn.`)
      return
    }

    if (pendingItems.some(item => item.book.id === Number(selectedBookId))) {
      setFormError('Đầu sách này đã có trong phiếu mượn.')
      return
    }

    try {
      const copyId = resolveCopyId()
      const selectedCopy = availableCopies.find(copy => copy.id === copyId)
      if (!selectedBook) {
        setFormError('Không tìm thấy thông tin sách đã chọn.')
        return
      }
      setPendingItems(items => [
        ...items,
        {
          book: selectedBook,
          copyId,
          copyLabel: selectedCopy ? describeCopy(selectedCopy) : copyId ? `Bản sao #${copyId}` : 'Hệ thống tự chọn bản sao',
        },
      ])
      setBookSearch('')
      setSelectedBookId('')
      setSelectedCopyId(AUTO_COPY)
      setManualCopyId('')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Mã bản sao không hợp lệ.')
    }
  }

  function handleConfirmBorrow() {
    setFormError('')
    if (!identifier.trim()) {
      setFormError('Vui lòng nhập username hoặc MSSV của sinh viên.')
      return
    }
    if (pendingItems.length === 0) {
      setFormError('Vui lòng thêm ít nhất một cuốn sách vào phiếu.')
      return
    }
    borrowMutation.mutate()
  }

  function handleChangeBorrower() {
    setIdentifier('')
    setPendingItems([])
    setFormError('')
  }

  function chooseBook(book: Book) {
    setSelectedBookId(String(book.id))
    setSelectedCopyId(AUTO_COPY)
    setManualCopyId('')
    setBookSearch(book.title)
  }

  const isPending = borrowMutation.isPending
  const canAddItem = Boolean(
    identifier.trim()
    && selectedBookId
    && pendingItems.length < MAX_BORROW_ITEMS
    && !isPending
  )
  const canConfirm = Boolean(identifier.trim() && pendingItems.length > 0 && !isPending)
  const borrowerLocked = pendingItems.length > 0

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Mượn trực tiếp tại quầy</CardTitle>
            <CardDescription>
              Dùng khi kiosk NFC không hoạt động hoặc thủ thư cần tạo lượt mượn thủ công.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">
            Mượn tại quầy
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddItem} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                Định danh sinh viên
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Select
                  value={identifierMode}
                  onValueChange={(value) => {
                    setIdentifierMode(value as IdentifierMode)
                    setIdentifier('')
                  }}
                  disabled={isPending || borrowerLocked}
                >
                  <SelectTrigger className="w-full" aria-label="Kiểu định danh sinh viên">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studentId">MSSV</SelectItem>
                    <SelectItem value="username">Username</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  data-testid="direct-borrow-identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={identifierMode === 'studentId' ? 'VD: 20200001' : 'VD: student01'}
                  aria-label="Thông tin định danh sinh viên"
                  disabled={isPending || borrowerLocked}
                />
              </div>

              {identifier.trim() && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                  {exactUser ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đã khớp sinh viên
                      </div>
                      <p>{exactUser.fullName}</p>
                      <p className="text-muted-foreground">
                        {exactUser.username} {exactUser.studentId ? `- MSSV ${exactUser.studentId}` : ''}
                      </p>
                      {borrowerLocked && (
                        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleChangeBorrower}>
                          Đổi sinh viên và xóa phiếu đang chọn
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        Chưa có khớp chính xác. Hệ thống sẽ kiểm tra khi tạo phiếu mượn.
                      </p>
                      {matchingUsers.length > 0 && (
                        <div className="space-y-1">
                          {matchingUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              className="block w-full rounded-md px-2 py-1 text-left hover:bg-background"
                              onClick={() => setIdentifier(identifierMode === 'username' ? user.username : user.studentId ?? user.username)}
                            >
                              {user.fullName} - {user.username}{user.studentId ? ` - ${user.studentId}` : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4 text-muted-foreground" />
                Chọn sách
              </div>
              <Input
                data-testid="direct-borrow-book-search"
                value={bookSearch}
                onChange={(event) => {
                  setBookSearch(event.target.value)
                  setSelectedBookId('')
                  setSelectedCopyId(AUTO_COPY)
                  setManualCopyId('')
                }}
                placeholder="Tìm theo tên sách hoặc tác giả"
                aria-label="Tìm sách"
                disabled={isPending}
              />
              <div className="min-h-24 rounded-lg border bg-muted/20 p-2">
                {bookSearch.trim().length < 2 ? (
                  <p className="p-2 text-xs text-muted-foreground">Nhập ít nhất 2 ký tự để tìm sách.</p>
                ) : bookSearchQuery.isLoading ? (
                  <p className="p-2 text-xs text-muted-foreground">Đang tìm sách...</p>
                ) : books.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">Không tìm thấy sách phù hợp.</p>
                ) : (
                  <div className="space-y-1">
                    {books.map(book => (
                      <button
                        data-testid={`direct-borrow-book-option-${book.id}`}
                        key={book.id}
                        type="button"
                        onClick={() => chooseBook(book)}
                        className={`flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-background ${
                          selectedBookId === String(book.id) ? 'bg-background ring-1 ring-border' : ''
                        }`}
                      >
                        <span>
                          <span className="line-clamp-1 font-medium">{book.title}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{book.author}</span>
                        </span>
                        <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'} className="shrink-0">
                          {book.availableCopies} có sẵn
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Copy className="h-4 w-4 text-muted-foreground" />
                Bản sao khả dụng
              </div>

              <div className="space-y-2">
                <Label htmlFor="available-copy">Chọn từ danh sách</Label>
                <Select
                  value={selectedCopyId}
                  onValueChange={setSelectedCopyId}
                  disabled={!selectedBookId || copiesQuery.isLoading || availableCopies.length === 0 || Boolean(manualCopyId.trim())}
                >
                  <SelectTrigger id="available-copy" className="w-full">
                    <SelectValue placeholder="Hệ thống tự chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO_COPY}>Hệ thống tự chọn bản sao</SelectItem>
                    {availableCopies.map(copy => (
                      <SelectItem key={copy.id} value={String(copy.id)}>
                        {describeCopy(copy)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBookId && !copiesQuery.isLoading && availableCopies.length === 0 && (
                  <p className="text-xs text-destructive">Sách này hiện không có bản sao sẵn sàng.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-copy-id">Hoặc nhập mã bản sao</Label>
                <Input
                  data-testid="direct-borrow-copy-id"
                  id="manual-copy-id"
                  value={manualCopyId}
                  onChange={(event) => setManualCopyId(event.target.value)}
                  placeholder="VD: 45"
                  inputMode="numeric"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Nhập trực tiếp khi đã biết mã bản sao. Hệ thống sẽ tự kiểm tra tính khả dụng.
                </p>
              </div>

              {selectedBook && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="mb-1 flex items-center gap-1.5 font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    Sách đã chọn
                  </div>
                  <p className="line-clamp-2">{selectedBook.title}</p>
                  <p className="text-muted-foreground">{selectedBook.availableCopies} bản sao sẵn sàng</p>
                </div>
              )}
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-testid="direct-borrow-error">{formError}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Nếu sinh viên có đặt trước đang chờ cho cùng đầu sách, hệ thống sẽ tự động xác nhận.
            </p>
            <Button type="submit" disabled={!canAddItem} variant="outline" className="sm:w-auto" data-testid="direct-borrow-add-item">
              <ListPlus className="mr-2 h-4 w-4" />
              Thêm vào phiếu
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-4 border-t pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">Sách trong phiếu</h3>
              <p className="text-xs text-muted-foreground">
                {pendingItems.length}/{MAX_BORROW_ITEMS} cuốn, cùng ngày mượn và hạn trả.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleConfirmBorrow}
              disabled={!canConfirm}
              data-testid="direct-borrow-submit"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận mượn {pendingItems.length > 0 ? `${pendingItems.length} cuốn` : ''}
            </Button>
          </div>

          {pendingItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Chưa có sách nào trong phiếu.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {pendingItems.map((item, index) => (
                <div key={item.book.id} className="flex items-center gap-3 p-3" data-testid={`direct-borrow-pending-${item.book.id}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.book.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.copyLabel}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Xóa ${item.book.title} khỏi phiếu`}
                    disabled={isPending}
                    onClick={() => setPendingItems(items => items.filter(candidate => candidate.book.id !== item.book.id))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
