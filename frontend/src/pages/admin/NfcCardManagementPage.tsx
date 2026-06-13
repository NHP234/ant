import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { nfcApi, type NfcScanEvent, type NfcStudent } from '@/api/nfc'
import { useNfcScanner } from '@/hooks/useNfcScanner'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/shared/PageHeader'
import Pagination from '@/components/shared/Pagination'
import NfcStudentScannerPanel from './components/NfcStudentScannerPanel'
import NfcStudentTable from './components/NfcStudentTable'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

interface ApiErrorResponse {
  message?: string
  error?: string
}

function getErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorResponse>
  return axiosError.response?.data?.message
    || axiosError.response?.data?.error
    || 'Không thể gán thẻ NFC. Vui lòng thử lại.'
}

export default function NfcCardManagementPage() {
  const queryClient = useQueryClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<NfcStudent | null>(null)

  const scanner = useNfcScanner({
    onRegisteredTag: (event: NfcScanEvent) => {
      const message = event.type === 'USER'
        ? 'Thẻ này đã được gán cho một sinh viên.'
        : 'Tag này đã được gán cho một bản sao sách.'
      toast.warning(`${message} Hãy quét một thẻ chưa đăng ký.`)
    },
    onReadError: () => toast.error('Không đọc được dữ liệu quét NFC từ hệ thống.'),
  })

  const studentsQuery = useQuery({
    queryKey: ['nfc', 'students', page, search],
    queryFn: () => nfcApi.getStudents(search, page, 10),
  })

  const registerMutation = useMutation({
    mutationFn: ({ userId, nfcCardUid }: { userId: number; nfcCardUid: string }) =>
      nfcApi.registerUser({ userId, nfcCardUid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfc', 'students'] })
      toast.success('Đã gán thẻ NFC cho sinh viên')
      scanner.stop()
      setSelectedStudent(null)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim())
      setPage(0)
    }, 300)
  }

  const startAssignment = (student: NfcStudent) => {
    setSelectedStudent(student)
    scanner.start()
  }

  const cancelAssignment = () => {
    scanner.stop()
    setSelectedStudent(null)
  }

  const confirmAssignment = () => {
    if (!selectedStudent || !scanner.scannedUid) return
    registerMutation.mutate({
      userId: selectedStudent.id,
      nfcCardUid: scanner.scannedUid,
    })
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  const students = studentsQuery.data?.data.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cấp thẻ NFC"
        description="Tìm sinh viên và gán thẻ định danh để sử dụng tại kiosk mượn trả."
      />

      {selectedStudent && (
        <NfcStudentScannerPanel
          student={selectedStudent}
          scannedUid={scanner.scannedUid}
          status={scanner.status}
          isSubmitting={registerMutation.isPending}
          onConfirm={confirmAssignment}
          onRetry={scanner.start}
          onCancel={cancelAssignment}
        />
      )}

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => handleSearchInput(event.target.value)}
          placeholder="Tìm theo MSSV, họ tên hoặc tên đăng nhập"
          className="pl-9"
          aria-label="Tìm sinh viên để cấp thẻ NFC"
          data-testid="nfc-student-search"
        />
      </div>

      <NfcStudentTable
        students={students}
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError}
        isSubmitting={registerMutation.isPending}
        onAssign={startAssignment}
      />

      {students && (
        <Pagination
          page={students.page}
          totalPages={students.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
