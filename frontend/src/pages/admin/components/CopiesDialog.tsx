import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookCopyApi, type BookCopy } from '@/api/books'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

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

export default function CopiesDialog({ open, onOpenChange, bookId }: CopiesDialogProps) {
  const queryClient = useQueryClient()

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

  const copies = copiesData?.data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) queryClient.removeQueries({ queryKey: ['admin', 'copies', bookId] }) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quản lý bản sao</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{copies.length} bản sao</p>
            <Button size="sm" onClick={() => bookId && addCopyMutation.mutate(bookId)} disabled={addCopyMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Thêm bản sao
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>NFC Tag</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {copies.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Chưa có bản sao nào</TableCell></TableRow>
              ) : (
                copies.map((copy) => (
                  <TableRow key={copy.id}>
                    <TableCell className="font-medium">{copy.copyNumber}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[copy.status]}>
                        {statusLabels[copy.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{copy.nfcTagUid || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive"
                        onClick={() => { if (confirm('Xóa bản sao này?')) deleteCopyMutation.mutate({ id: copy.id }) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
