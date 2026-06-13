import type { NfcStudent } from '@/api/nfc'
import type { PageResponse } from '@/api/books'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreditCard, Loader2, WifiOff } from 'lucide-react'

interface NfcStudentTableProps {
  students?: PageResponse<NfcStudent>
  isLoading: boolean
  isError: boolean
  isSubmitting: boolean
  onAssign: (student: NfcStudent) => void
}

export default function NfcStudentTable({
  students,
  isLoading,
  isError,
  isSubmitting,
  onAssign,
}: NfcStudentTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Sinh viên</TableHead>
            <TableHead>MSSV</TableHead>
            <TableHead>Thẻ NFC</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center">
                <WifiOff className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Không tải được danh sách sinh viên.</p>
              </TableCell>
            </TableRow>
          ) : !students?.content.length ? (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center">
                <CreditCard className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Không tìm thấy sinh viên phù hợp.</p>
              </TableCell>
            </TableRow>
          ) : (
            students.content.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <p className="font-medium">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground">{student.username}</p>
                </TableCell>
                <TableCell>{student.studentId || '-'}</TableCell>
                <TableCell className="font-mono text-xs">
                  {student.nfcCardUid || 'Chưa cấp'}
                </TableCell>
                <TableCell>
                  <Badge variant={student.isActive ? 'default' : 'secondary'}>
                    {student.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAssign(student)}
                    disabled={!student.isActive || isSubmitting}
                    data-testid={`assign-nfc-student-${student.id}`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {student.nfcCardUid ? 'Đổi thẻ' : 'Gán thẻ'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
