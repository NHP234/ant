import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { bookCopyApi } from '@/api/books'
import type { BookCopy } from '@/api/books'
import { nfcApi } from '@/api/nfc'
import type { NfcScanEvent } from '@/api/nfc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, Loader2, Plus, ScanLine, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

interface CopiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookId: number | null
}

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Có sẵn',
  BORROWED: 'Đang mượn',
  RESERVED: 'Giữ chỗ',
  DAMAGED: 'Hư hỏng',
  LOST: 'Mất',
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  AVAILABLE: 'default',
  BORROWED: 'secondary',
  RESERVED: 'secondary',
  DAMAGED: 'destructive',
  LOST: 'destructive',
}

type ScannerStatus = 'IDLE' | 'CONNECTING' | 'WAITING' | 'SCANNED' | 'ERROR'

interface ApiErrorResponse {
  message?: string
  error?: string
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorResponse>
  return axiosError.response?.data?.message
    || axiosError.response?.data?.error
    || 'Không thể gán tag NFC. Vui lòng thử lại.'
}

export default function CopiesDialog({ open, onOpenChange, bookId }: CopiesDialogProps) {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const [targetCopy, setTargetCopy] = useState<BookCopy | null>(null)
  const [scannedUid, setScannedUid] = useState('')
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('IDLE')

  const { data: copiesData } = useQuery({
    queryKey: ['admin', 'copies', bookId],
    queryFn: () => bookCopyApi.getCopies(bookId!),
    enabled: !!bookId,
  })

  const addCopyMutation = useMutation({
    mutationFn: (id: number) => bookCopyApi.addCopy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'copies', bookId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Thêm bản sao thành công')
    },
    onError: () => toast.error('Thêm bản sao thất bại'),
  })

  const deleteCopyMutation = useMutation({
    mutationFn: ({ id }: { id: number }) => bookCopyApi.deleteCopy(bookId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'copies', bookId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Đã xóa bản sao')
    },
    onError: () => toast.error('Xóa bản sao thất bại'),
  })

  const closeEventSource = () => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }

  const stopScanner = () => {
    closeEventSource()
    setTargetCopy(null)
    setScannedUid('')
    setScannerStatus('IDLE')
  }

  const registerTagMutation = useMutation({
    mutationFn: ({ copyId, nfcTagUid }: { copyId: number; nfcTagUid: string }) =>
      nfcApi.registerBookCopy({ copyId, nfcTagUid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'copies', bookId] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      toast.success('Đã gán tag NFC cho bản sao')
      stopScanner()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handleNfcEvent = (event: MessageEvent<string>) => {
    try {
      const scan = JSON.parse(event.data) as NfcScanEvent

      if (scan.type !== 'UNKNOWN' || !scan.data.uid) {
        const message = scan.type === 'USER'
          ? 'Thẻ này đã được gán cho một người dùng.'
          : 'Tag này đã được gán cho một bản sao sách.'
        toast.warning(`${message} Hãy quét một tag chưa đăng ký.`)
        return
      }

      setScannedUid(scan.data.uid)
      setScannerStatus('SCANNED')
      closeEventSource()
    } catch {
      setScannerStatus('ERROR')
      toast.error('Không đọc được dữ liệu quét NFC từ hệ thống.')
    }
  }

  const startScanner = (copy: BookCopy) => {
    closeEventSource()
    setTargetCopy(copy)
    setScannedUid('')
    setScannerStatus('CONNECTING')

    const source = new EventSource(nfcApi.getStreamUrl())
    eventSourceRef.current = source
    source.onopen = () => setScannerStatus('WAITING')
    source.addEventListener('nfc-scan', handleNfcEvent as EventListener)
    source.onerror = () => {
      closeEventSource()
      setScannerStatus('ERROR')
    }
  }

  const confirmTag = () => {
    if (!targetCopy || !scannedUid) return
    registerTagMutation.mutate({
      copyId: targetCopy.id,
      nfcTagUid: scannedUid,
    })
  }

  useEffect(() => () => closeEventSource(), [])

  const copies = copiesData?.data?.data ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          stopScanner()
          queryClient.removeQueries({ queryKey: ['admin', 'copies', bookId] })
        }
      }}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Quản lý bản sao</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {targetCopy && (
            <div className="max-w-full min-w-0 rounded-md border bg-muted/30 p-4" data-testid="nfc-scanner-panel">
              <div className="space-y-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">Gán NFC cho bản sao #{targetCopy.copyNumber}</p>

                  {scannerStatus === 'CONNECTING' && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang kết nối đầu đọc...
                    </p>
                  )}

                  {scannerStatus === 'WAITING' && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ScanLine className="h-4 w-4" />
                      Đang chờ quét một tag chưa đăng ký.
                    </p>
                  )}

                  {scannerStatus === 'SCANNED' && (
                    <p className="break-all text-sm">
                      UID vừa quét: <span className="font-mono font-semibold">{scannedUid}</span>
                    </p>
                  )}

                  {scannerStatus === 'ERROR' && (
                    <p className="text-sm text-destructive">
                      Mất kết nối với luồng NFC. Hãy thử kết nối lại.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                  {scannerStatus === 'SCANNED' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startScanner(targetCopy)}
                        disabled={registerTagMutation.isPending}
                      >
                        <ScanLine className="h-4 w-4" />
                        Quét lại
                      </Button>
                      <Button
                        size="sm"
                        onClick={confirmTag}
                        disabled={registerTagMutation.isPending}
                        data-testid="confirm-nfc-tag"
                      >
                        {registerTagMutation.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Check className="h-4 w-4" />}
                        Xác nhận gán
                      </Button>
                    </>
                  )}

                  {scannerStatus === 'ERROR' && (
                    <Button size="sm" onClick={() => startScanner(targetCopy)}>
                      <ScanLine className="h-4 w-4" />
                      Kết nối lại
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopScanner}
                    disabled={registerTagMutation.isPending}
                    aria-label="Hủy chờ quét NFC"
                  >
                    <X className="h-4 w-4" />
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{copies.length} bản sao</p>
            <Button
              size="sm"
              onClick={() => bookId && addCopyMutation.mutate(bookId)}
              disabled={addCopyMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Thêm bản sao
            </Button>
          </div>

          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>NFC Tag</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {copies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                    Chưa có bản sao nào
                  </TableCell>
                </TableRow>
              ) : (
                copies.map((copy) => (
                  <TableRow key={copy.id}>
                    <TableCell className="font-medium">{copy.copyNumber}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[copy.status]}>
                        {statusLabels[copy.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {copy.nfcTagUid || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startScanner(copy)}
                          disabled={registerTagMutation.isPending}
                          data-testid={`assign-nfc-copy-${copy.id}`}
                        >
                          <ScanLine className="h-4 w-4" />
                          {copy.nfcTagUid ? 'Đổi tag' : 'Gán tag'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Xóa bản sao ${copy.copyNumber}`}
                          onClick={() => {
                            if (confirm('Xóa bản sao này?')) {
                              deleteCopyMutation.mutate({ id: copy.id })
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
