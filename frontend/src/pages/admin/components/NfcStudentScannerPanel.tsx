import type { NfcStudent } from '@/api/nfc'
import type { NfcScannerStatus } from '@/hooks/useNfcScanner'
import { Button } from '@/components/ui/button'
import { Check, CreditCard, Loader2, ScanLine, X } from 'lucide-react'

interface NfcStudentScannerPanelProps {
  student: NfcStudent
  scannedUid: string
  status: NfcScannerStatus
  isSubmitting: boolean
  onConfirm: () => void
  onRetry: () => void
  onCancel: () => void
}

export default function NfcStudentScannerPanel({
  student,
  scannedUid,
  status,
  isSubmitting,
  onConfirm,
  onRetry,
  onCancel,
}: NfcStudentScannerPanelProps) {
  return (
    <section
      className="rounded-md border bg-muted/30 p-4"
      data-testid="nfc-student-scanner-panel"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-semibold">
                {student.nfcCardUid ? 'Đổi thẻ cho' : 'Cấp thẻ cho'} {student.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                MSSV: {student.studentId || 'Chưa có'} · Tài khoản: {student.username}
              </p>
              {student.nfcCardUid && (
                <p className="break-all text-sm text-muted-foreground">
                  Thẻ hiện tại: <span className="font-mono">{student.nfcCardUid}</span>
                </p>
              )}
            </div>
          </div>

          {status === 'CONNECTING' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kết nối đầu đọc...
            </p>
          )}

          {status === 'WAITING' && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4" />
              Đang chờ quét một thẻ chưa được đăng ký.
            </p>
          )}

          {status === 'SCANNED' && (
            <p className="break-all text-sm">
              UID vừa quét: <span className="font-mono font-semibold">{scannedUid}</span>
            </p>
          )}

          {status === 'ERROR' && (
            <p className="text-sm text-destructive">
              Mất kết nối với luồng NFC. Kiểm tra backend và thử kết nối lại.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {status === 'SCANNED' && (
            <>
              <Button variant="outline" onClick={onRetry} disabled={isSubmitting}>
                <ScanLine className="h-4 w-4" />
                Quét lại
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isSubmitting}
                data-testid="confirm-student-nfc-card"
              >
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Check className="h-4 w-4" />}
                Xác nhận gán
              </Button>
            </>
          )}

          {status === 'ERROR' && (
            <Button onClick={onRetry}>
              <ScanLine className="h-4 w-4" />
              Kết nối lại
            </Button>
          )}

          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4" />
            Hủy
          </Button>
        </div>
      </div>
    </section>
  )
}
