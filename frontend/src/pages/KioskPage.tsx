import { useState, useEffect, useEffectEvent, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { borrowApi } from '@/api/borrows'
import { borrowSlipApi } from '@/api/borrowSlips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Check, X, ShieldAlert, Wifi, WifiOff, RefreshCw,
  Library, User as UserIcon, BookOpen, ArrowRightLeft, CreditCard,
} from 'lucide-react'
import { getErrorDescription } from '@/lib/errorMessages'
import BookCover from '@/components/shared/BookCover'

import type { KioskState, KioskUser, BookCopyData, NfcScanEvent, KioskToast } from './kiosk/types'
import { getCopyStatusLabel } from './kiosk/types'
import { useKioskAudio } from './kiosk/useKioskAudio'
import { useKioskSSE } from './kiosk/useKioskSSE'
import type { BorrowRecord } from '@/api/borrows'

// ─── CSS token helpers (maps to --kiosk-* vars in index.css) ───
const k = {
  bg: 'bg-[var(--kiosk-bg)]',
  text: 'text-[var(--kiosk-text)]',
  textMuted: 'text-[var(--kiosk-text-muted)]',
  textSubtle: 'text-[var(--kiosk-text-subtle)]',
  textLabel: 'text-[var(--kiosk-text-label)]',
  surface: 'bg-[var(--kiosk-surface)]',
  surfaceAlt: 'bg-[var(--kiosk-surface-alt)]',
  border: 'border-[var(--kiosk-border)]',
  borderSubtle: 'border-[var(--kiosk-border-subtle)]',
  successText: 'text-[var(--kiosk-success)]',
  successBg: 'bg-[var(--kiosk-success-bg)]',
  successBgStrong: 'bg-[var(--kiosk-success-bg-strong)]',
  successBorder: 'border-[var(--kiosk-success-border)]',
  successBorderStrong: 'border-[var(--kiosk-success-border-strong)]',
  errorText: 'text-[var(--kiosk-error)]',
  errorBg: 'bg-[var(--kiosk-error-bg)]',
  errorBorder: 'border-[var(--kiosk-error-border)]',
  warningText: 'text-[var(--kiosk-warning)]',
  warningBg: 'bg-[var(--kiosk-warning-bg)]',
  infoText: 'text-[var(--kiosk-info)]',
  infoDark: 'text-[var(--kiosk-info-dark)]',
  infoBg: 'bg-[var(--kiosk-info-bg)]',
  infoBorder: 'border-[var(--kiosk-info-border)]',
  returnText: 'text-[var(--kiosk-return)]',
  returnBg: 'bg-[var(--kiosk-return-bg)]',
  returnBorder: 'border-[var(--kiosk-return-border)]',
} as const

// ─── Sub-components ─── //

/** Floating toast notification */
function KioskToastBar({ toast }: { toast: KioskToast }) {
  const variants = {
    success: `${k.successBg} ${k.successBorder} ${k.successText}`,
    warning: `${k.warningBg} ${k.errorBorder} ${k.warningText}`,
    error: `${k.errorBg} ${k.errorBorder} ${k.errorText}`,
  }
  const icons = {
    success: <Check className="w-6 h-6 shrink-0" />,
    warning: <ShieldAlert className="w-6 h-6 shrink-0" />,
    error: <X className="w-6 h-6 shrink-0" />,
  }
  return (
    <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg border text-lg font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${variants[toast.type]}`}>
      {icons[toast.type]}
      <span>{toast.text}</span>
    </div>
  )
}

/** Kiosk header bar with branding, countdown, SSE status, and logout */
function KioskHeader({
  kioskState, countdown, sseStatus, onLogout,
}: {
  kioskState: KioskState
  countdown: number
  sseStatus: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'
  onLogout: () => void
}) {
  return (
    <header className={`flex justify-between items-center border-b ${k.border} pb-4`}>
      <div className="flex items-center gap-3">
        <Library className={`w-8 h-8 ${k.textSubtle}`} />
        <div>
          <h2 className="text-xl font-bold tracking-tight">Thư viện Awaken Ant</h2>
          <p className={`text-xs ${k.textSubtle} uppercase tracking-widest font-semibold`}>Trạm tự phục vụ</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {kioskState !== 'WAITING_FOR_USER' && (
          <div className={`px-3 py-1 ${k.surfaceAlt} rounded-full text-xs font-semibold ${k.textSubtle} flex items-center gap-2 border ${k.border}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Phiên kết thúc sau: {countdown}s</span>
          </div>
        )}

        <SseIndicator status={sseStatus} />

        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100"
        >
          Đóng Kiosk
        </Button>
      </div>
    </header>
  )
}

/** SSE connection indicator */
function SseIndicator({ status }: { status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border ${k.border} text-xs font-medium shadow-sm`}>
      {status === 'CONNECTED' ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
            <Wifi className="w-3.5 h-3.5" /> Đầu đọc sẵn sàng
          </span>
        </>
      ) : status === 'CONNECTING' ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          <span className="text-amber-700 font-semibold">Đang kết nối...</span>
        </>
      ) : (
        <>
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          <span className="text-rose-700 flex items-center gap-1 font-semibold">
            <WifiOff className="w-3.5 h-3.5" /> Mất kết nối
          </span>
        </>
      )}
    </div>
  )
}

/** STATE: Waiting for student card scan */
function WaitingForUserView() {
  return (
    <div className="text-center space-y-8 max-w-xl animate-in fade-in duration-500">
      <div className={`relative mx-auto w-40 h-40 bg-white border ${k.border} rounded-full flex items-center justify-center shadow-lg`}>
        <div className={`absolute inset-0 rounded-full border border-dashed ${k.borderSubtle} animate-ping opacity-25`} />
        <div className={`absolute inset-4 rounded-full border border-dashed ${k.borderSubtle} animate-ping opacity-50 duration-1000`} />
        <CreditCard className={`w-20 h-20 ${k.textSubtle} animate-pulse`} />
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
          Vui lòng quẹt thẻ sinh viên
        </h1>
        <p className={`text-lg ${k.textMuted} font-medium tracking-wide`}>
          Đưa thẻ của bạn lại gần đầu đọc để bắt đầu mượn hoặc trả sách.
        </p>
      </div>

      <div className={`pt-4 flex items-center justify-center gap-6 ${k.textSubtle} text-sm font-semibold uppercase tracking-wider`}>
        <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Nhanh chóng</span>
        <span className={`w-1.5 h-1.5 ${k.surfaceAlt} rounded-full`} />
        <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Tự động</span>
        <span className={`w-1.5 h-1.5 ${k.surfaceAlt} rounded-full`} />
        <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Tiện lợi</span>
      </div>
    </div>
  )
}

/** STATE: Select borrow or return mode */
function SelectModeView({
  user, onBorrow, onReturn, onCancel,
}: {
  user: KioskUser
  onBorrow: () => void
  onReturn: () => void
  onCancel: () => void
}) {
  return (
    <div className="w-full max-w-4xl space-y-10 animate-in fade-in duration-500">
      {/* User info card */}
      <div className={`bg-white border ${k.border} p-6 rounded-2xl shadow-sm flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 ${k.surfaceAlt} border ${k.border} rounded-xl flex items-center justify-center ${k.textSubtle}`}>
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className={`text-xs ${k.textSubtle} uppercase tracking-widest font-bold`}>Xin chào</h3>
            <h2 className="text-2xl font-bold">{user.fullName}</h2>
            <p className={`text-sm ${k.textMuted} font-medium`}>Mã sinh viên: {user.studentId}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className={`${k.border} hover:${k.surfaceAlt} ${k.textMuted}`}
        >
          Hủy phiên
        </Button>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button
          type="button"
          data-testid="kiosk-select-borrow"
          onClick={onBorrow}
          className={`group cursor-pointer bg-white border ${k.border} rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-[var(--kiosk-text-subtle)] transition-all duration-300 flex flex-col items-center text-center space-y-6`}
        >
          <div className={`w-20 h-20 ${k.successBg} border ${k.successBorder} rounded-full flex items-center justify-center ${k.successText} group-hover:scale-110 transition-transform`}>
            <BookOpen className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-extrabold">Mượn Sách</h3>
            <p className={`${k.textMuted} font-medium`}>Quét sách bạn muốn mượn tại trạm tự phục vụ.</p>
          </div>
        </button>

        <button
          type="button"
          data-testid="kiosk-select-return"
          onClick={onReturn}
          className={`group cursor-pointer bg-white border ${k.border} rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-[var(--kiosk-text-subtle)] transition-all duration-300 flex flex-col items-center text-center space-y-6`}
        >
          <div className={`w-20 h-20 ${k.surfaceAlt} border ${k.border} rounded-full flex items-center justify-center ${k.textSubtle} group-hover:scale-110 transition-transform`}>
            <ArrowRightLeft className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-extrabold">Trả Sách</h3>
            <p className={`${k.textMuted} font-medium`}>Quét sách đã mượn để hoàn tất trả.</p>
          </div>
        </button>
      </div>
    </div>
  )
}

/** Numbered step list for guides */
function StepList({ steps }: { steps: string[] }) {
  return (
    <ul className={`space-y-3 text-sm ${k.textMuted} font-medium`}>
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`w-5 h-5 ${k.surfaceAlt} border ${k.border} ${k.textSubtle} rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5`}>
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ul>
  )
}

/** STATE: Scanning books to borrow */
function ScanningBorrowView({
  user, copies, onRemoveCopy, onConfirm, onCancel, playBeep,
}: {
  user: KioskUser
  copies: BookCopyData[]
  onRemoveCopy: (id: number) => void
  onConfirm: () => void
  onCancel: () => void
  playBeep: (type: 'success' | 'warn' | 'error') => void
}) {
  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      {/* Mode header */}
      <div className={`${k.infoBg} border ${k.infoBorder} p-6 rounded-2xl flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center ${k.infoText} shadow-sm border ${k.infoBorder}`}>
            <BookOpen className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className={`text-xs ${k.infoText} uppercase tracking-widest font-bold`}>Chế độ</h4>
            <h2 className={`text-xl font-bold ${k.infoDark}`}>Đang quét sách cần mượn</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-600">Sinh viên: {user.fullName}</p>
          <p className="text-xs text-slate-400">Quẹt lần lượt từng cuốn sách vào đầu đọc</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scanned books list */}
        <div className={`md:col-span-2 bg-white border ${k.border} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[350px]`}>
          <div className={`${k.surface} px-6 py-4 border-b ${k.border} flex justify-between items-center`}>
            <span className={`font-semibold text-sm ${k.textLabel}`}>Danh sách sách đã quét ({copies.length})</span>
            <span className={`text-xs ${k.textSubtle} font-semibold uppercase tracking-wider`}>Tối đa: 5 cuốn</span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {copies.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center space-y-3 py-12 ${k.textSubtle}`}>
                <CreditCard className="w-12 h-12 stroke-[1.5]" />
                <p className={`text-lg font-medium ${k.textLabel}`}>Chưa có sách nào được quét</p>
                <p className="text-sm max-w-xs">Đặt bìa sau của sách lại gần đầu đọc NFC.</p>
              </div>
            ) : (
              copies.map((copy, index) => (
                <div
                  key={copy.id}
                  className={`p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-[var(--kiosk-text-subtle)] transition-colors`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`w-8 h-8 rounded-lg ${k.surfaceAlt} border ${k.border} ${k.textSubtle} flex items-center justify-center font-bold text-sm shrink-0`}>
                      {index + 1}
                    </span>
                    <div className="w-12 aspect-[2/3] rounded overflow-hidden bg-muted border border-slate-200 shrink-0 shadow-sm">
                      <BookCover
                        src={copy.coverImageUrl}
                        title={copy.title || ''}
                        fallbackClassName="text-[10px]"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold leading-tight truncate">{copy.title || `Sách #${copy.copyNumber}`}</h4>
                      <p className={`text-xs ${k.textMuted}`}>Bản sao #{copy.copyNumber}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Bỏ sách khỏi danh sách"
                    onClick={() => { onRemoveCopy(copy.id); playBeep('warn') }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Guide panel */}
        <div className={`${k.surface} border ${k.border} rounded-2xl p-6 flex flex-col justify-between`}>
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${k.textLabel} border-b ${k.border} pb-2`}>Hướng dẫn</h3>
            <StepList steps={[
              'Quét nhãn NFC ở mặt sau bìa sách.',
              'Kiểm tra tên sách hiển thị trên danh sách.',
              'Nhấn "Hoàn tất mượn" để xác nhận (hạn trả 14 ngày).',
            ]} />
          </div>

          <div className="space-y-3 pt-6">
            <Button
              onClick={onConfirm}
              disabled={copies.length === 0}
              className="w-full bg-[var(--kiosk-success)] hover:bg-[var(--kiosk-success-hover)] text-white py-6 text-lg font-bold shadow-sm"
            >
              Hoàn tất mượn ({copies.length} sách)
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className={`w-full ${k.border} hover:${k.surfaceAlt} ${k.textMuted}`}
            >
              Hủy lượt mượn
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** STATE: Scanning books to return */
function ScanningReturnView({
  user, borrows, scannedIds, onUnscanReturn, onConfirm, onCancel, playBeep,
}: {
  user: KioskUser
  borrows: BorrowRecord[]
  scannedIds: number[]
  onUnscanReturn: (id: number) => void
  onConfirm: () => void
  onCancel: () => void
  playBeep: (type: 'success' | 'warn' | 'error') => void
}) {
  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className={`${k.returnBg} border ${k.returnBorder} p-6 rounded-2xl flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center ${k.returnText} shadow-sm border ${k.returnBorder}`}>
            <ArrowRightLeft className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className={`text-xs ${k.returnText} uppercase tracking-widest font-bold`}>Chế độ</h4>
            <h2 className="text-xl font-bold text-[var(--kiosk-return-hover)]">Đang quét sách cần trả</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-600">Sinh viên: {user.fullName}</p>
          <p className="text-xs text-slate-400">Đặt sách đang mượn lên đầu đọc NFC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`md:col-span-2 bg-white border ${k.border} rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[350px]`}>
          <div className={`${k.surface} px-6 py-4 border-b ${k.border} flex justify-between items-center`}>
            <span className={`font-semibold text-sm ${k.textLabel}`}>Sách bạn đang mượn ({borrows.length})</span>
            <span className={`text-xs ${k.returnText} font-bold uppercase tracking-wider`}>
              Đã quét: {scannedIds.length} / {borrows.length}
            </span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {borrows.length === 0 ? (
              <div className={`h-full flex flex-col items-center justify-center text-center space-y-3 py-12 ${k.textSubtle}`}>
                <Check className={`w-12 h-12 stroke-[1.5] ${k.successText} ${k.successBgStrong} p-2.5 rounded-full border ${k.successBorderStrong}`} />
                <p className={`text-lg font-bold ${k.textLabel}`}>Không có sách nào cần trả</p>
                <p className="text-sm max-w-xs">Bạn hiện không có sách nào đang mượn.</p>
              </div>
            ) : (
              borrows.map((record) => {
                const isScanned = scannedIds.includes(record.id)
                return (
                  <div
                    key={record.id}
                    className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                      isScanned
                        ? `${k.successBgStrong} ${k.successBorderStrong} ${k.successText}`
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${
                        isScanned
                          ? `bg-[var(--kiosk-success-border)] ${k.successBorderStrong} ${k.successText}`
                          : `${k.surfaceAlt} ${k.border} ${k.textSubtle}`
                      }`}>
                        {isScanned ? <Check className="w-4 h-4" /> : record.copyNumber}
                      </div>
                      <div>
                        <h4 className="font-bold">{record.bookTitle}</h4>
                        <p className={`text-xs ${isScanned ? 'text-emerald-500' : k.textMuted}`}>
                          {record.bookAuthor} · Hạn trả: {new Date(record.dueDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isScanned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { onUnscanReturn(record.id); playBeep('warn') }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100"
                        >
                          Bỏ quét
                        </Button>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 ${k.errorBorder} border bg-rose-50 text-rose-700 rounded-full`}>
                          Chờ quét...
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Guide panel */}
        <div className={`${k.surface} border ${k.border} rounded-2xl p-6 flex flex-col justify-between`}>
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${k.textLabel} border-b ${k.border} pb-2`}>Hướng dẫn</h3>
            <StepList steps={[
              'Quét nhãn NFC ở mặt sau bìa sách cần trả.',
              'Sách đã nhận diện sẽ chuyển thành màu xanh.',
              'Nhấn "Hoàn tất trả sách" để xác nhận.',
            ]} />
          </div>

          <div className="space-y-3 pt-6">
            <Button
              onClick={onConfirm}
              disabled={scannedIds.length === 0}
              className="w-full bg-[var(--kiosk-return)] hover:bg-[var(--kiosk-return-hover)] text-white py-6 text-lg font-bold shadow-sm"
            >
              Hoàn tất trả ({scannedIds.length} sách)
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className={`w-full ${k.border} hover:${k.surfaceAlt} ${k.textMuted}`}
            >
              Hủy lượt trả
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** STATE: Processing spinner */
function ProcessingView({ mode }: { mode: 'BORROW' | 'RETURN' | null }) {
  return (
    <div className="text-center space-y-6 py-12 animate-in fade-in duration-300">
      <RefreshCw className={`w-16 h-16 ${k.textSubtle} animate-spin mx-auto`} />
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          Đang xử lý {mode === 'RETURN' ? 'trả sách' : 'mượn sách'}...
        </h2>
        <p className={`${k.textMuted} text-sm font-medium`}>Vui lòng chờ trong giây lát.</p>
      </div>
    </div>
  )
}

/** STATE: Success */
function SuccessView({ mode }: { mode: 'BORROW' | 'RETURN' | null }) {
  return (
    <div className="text-center space-y-6 py-12 max-w-md animate-in zoom-in duration-500">
      <div className={`mx-auto w-24 h-24 ${k.successBgStrong} border ${k.successBorderStrong} rounded-full flex items-center justify-center ${k.successText} shadow-md`}>
        <Check className="w-14 h-14" />
      </div>
      <div className="space-y-3">
        <h2 className={`text-3xl font-extrabold ${k.successText}`}>
          {mode === 'RETURN' ? 'Trả sách' : 'Mượn sách'} thành công!
        </h2>
        <p className="text-lg text-slate-600 font-medium leading-relaxed">
          Thông báo xác nhận và chi tiết hạn trả đã được cập nhật vào tài khoản của bạn.
        </p>
      </div>
      <p className="text-xs text-slate-400 font-semibold pt-4">Màn hình sẽ tự động quay về sau vài giây...</p>
    </div>
  )
}

/** STATE: Error */
function ErrorView({ message, onReset, mode }: { message: string; onReset: () => void; mode: 'BORROW' | 'RETURN' | null }) {
  return (
    <div className="text-center space-y-6 py-12 max-w-md animate-in zoom-in duration-500">
      <div className={`mx-auto w-24 h-24 ${k.errorBg} border ${k.errorBorder} rounded-full flex items-center justify-center ${k.errorText} shadow-md`}>
        <ShieldAlert className="w-14 h-14" />
      </div>
      <div className="space-y-3">
        <h2 className={`text-3xl font-extrabold ${k.errorText}`}>
          {mode === 'RETURN' ? 'Trả sách' : 'Mượn sách'} thất bại
        </h2>
        <p className="text-lg text-rose-700 font-medium leading-relaxed">
          {message || 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ thủ thư.'}
        </p>
      </div>
      <div className="flex gap-4 justify-center pt-4">
        <Button onClick={onReset} className="bg-[var(--kiosk-btn-bg)] text-white hover:bg-[var(--kiosk-btn-hover)]">
          Quay lại màn chờ
        </Button>
      </div>
    </div>
  )
}

// ─── Main KioskPage orchestrator ─── //

export default function KioskPage() {
  const { user, login, logout } = useAuth()
  const { playBeep } = useKioskAudio()

  const isActivated = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN')

  // Activation form state
  const [activationUsername, setActivationUsername] = useState('')
  const [activationPassword, setActivationPassword] = useState('')
  const [activationError, setActivationError] = useState('')
  const [isActivating, setIsActivating] = useState(false)

  // Kiosk state machine
  const [kioskState, setKioskState] = useState<KioskState>('WAITING_FOR_USER')
  const [currentUser, setCurrentUser] = useState<KioskUser | null>(null)
  const [scannedBorrowCopies, setScannedBorrowCopies] = useState<BookCopyData[]>([])
  const [activeUserBorrows, setActiveUserBorrows] = useState<BorrowRecord[]>([])
  const [scannedReturnIds, setScannedReturnIds] = useState<number[]>([])
  const [toastMessage, setToastMessage] = useState<KioskToast | null>(null)
  const [transactionError, setTransactionError] = useState('')
  const [countdown, setCountdown] = useState(30)
  const [activeMode, setActiveMode] = useState<'BORROW' | 'RETURN' | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Toast helper ───
  const showToast = (text: string, type: 'success' | 'warning' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage({ text, type })
    playBeep(type === 'success' ? 'success' : type === 'warning' ? 'warn' : 'error')
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000)
  }

  // ─── Activation handler ───
  const handleActivateKiosk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsActivating(true)
    setActivationError('')
    try {
      await login({ username: activationUsername, password: activationPassword })
      showToast('Trạm tự phục vụ đã được kích hoạt!', 'success')
    } catch (error: unknown) {
      setActivationError(getErrorDescription(error))
      playBeep('error')
    } finally {
      setIsActivating(false)
    }
  }

  // ─── Reset session ───
  const handleResetKiosk = () => {
    setCountdown(30)
    setKioskState('WAITING_FOR_USER')
    setCurrentUser(null)
    setScannedBorrowCopies([])
    setScannedReturnIds([])
    setActiveUserBorrows([])
    setTransactionError('')
    setActiveMode(null)
  }

  // ─── NFC scan event handler ───
  const handleNfcScanEvent = useEffectEvent((eventData: NfcScanEvent) => {
    setCountdown(30)
    const { type, data } = eventData

    if (kioskState === 'WAITING_FOR_USER') {
      if (type === 'USER') {
        setCurrentUser(data as KioskUser)
        setKioskState('SELECT_MODE')
        playBeep('success')
      } else {
        showToast('Vui lòng quẹt thẻ sinh viên trước để bắt đầu!', 'warning')
      }
    } else if (kioskState === 'SELECT_MODE') {
      if (type === 'USER') {
        const u = data as KioskUser
        setCurrentUser(u)
        setScannedBorrowCopies([])
        setScannedReturnIds([])
        setActiveUserBorrows([])
        showToast(`Đã chuyển sang sinh viên: ${u.fullName}`, 'success')
      } else {
        showToast('Vui lòng chọn Mượn Sách hoặc Trả Sách trên màn hình!', 'warning')
      }
    } else if (kioskState === 'SCANNING_BORROW') {
      if (type === 'USER') {
        const u = data as KioskUser
        if (u.id === currentUser?.id) {
          showToast('Thẻ sinh viên đã được nhận dạng.', 'warning')
        } else {
          showToast('Hệ thống đang bận xử lý lượt mượn/trả khác, vui lòng chờ!', 'error')
        }
      } else if (type === 'BOOK_COPY') {
        const copy = data as BookCopyData
        if (scannedBorrowCopies.some(c => c.id === copy.id)) {
          showToast('Sách này đã có trong danh sách.', 'warning')
          return
        }
        if (scannedBorrowCopies.some(c => c.bookId === copy.bookId)) {
          showToast('Không thể mượn hai bản sao của cùng một đầu sách.', 'warning')
          return
        }
        if (scannedBorrowCopies.length >= 5) {
          showToast('Mỗi phiếu chỉ được mượn tối đa 5 cuốn.', 'warning')
          return
        }
        if (copy.status !== 'AVAILABLE' && copy.status !== 'RESERVED') {
          showToast(`Sách này hiện ${getCopyStatusLabel(copy.status).toLowerCase()}, không thể mượn.`, 'error')
          return
        }
        setScannedBorrowCopies(prev => [...prev, copy])
        showToast('Đã thêm sách vào danh sách mượn!', 'success')
      } else {
        showToast('Nhãn NFC này không được nhận dạng là sách.', 'error')
      }
    } else if (kioskState === 'SCANNING_RETURN') {
      if (type === 'USER') {
        showToast('Vui lòng quét sách cần trả, không quét thẻ sinh viên!', 'warning')
      } else if (type === 'BOOK_COPY') {
        const copy = data as BookCopyData
        const matchingRecord = activeUserBorrows.find(r => r.copyId === copy.id)
        if (!matchingRecord) {
          showToast('Cuốn sách này không thuộc danh sách sách bạn đang mượn!', 'error')
          return
        }
        if (scannedReturnIds.includes(matchingRecord.id)) {
          showToast('Sách này đã được quét nhận diện.', 'warning')
          return
        }
        setScannedReturnIds(prev => [...prev, matchingRecord.id])
        showToast('Đã nhận diện sách cần trả!', 'success')
      } else {
        showToast('Nhãn NFC này không phải sách đang mượn.', 'error')
      }
    }
  })

  // ─── SSE connection ───
  const { sseStatus } = useKioskSSE(!!isActivated, handleNfcScanEvent)

  // ─── Mode selection handlers ───
  const handleSelectBorrow = () => {
    setCountdown(30)
    setActiveMode('BORROW')
    setKioskState('SCANNING_BORROW')
    playBeep('success')
  }

  const handleSelectReturn = async () => {
    if (!currentUser) return
    setCountdown(30)
    setActiveMode('RETURN')
    setKioskState('PROCESSING')
    playBeep('success')
    try {
      const res = await borrowApi.getActiveBorrows(currentUser.studentId)
      setActiveUserBorrows(res.data.data)
      setKioskState('SCANNING_RETURN')
    } catch {
      setTransactionError('Không thể tải danh sách sách đang mượn. Vui lòng thử lại.')
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // ─── Confirm borrow ───
  const handleConfirmBorrow = async () => {
    if (scannedBorrowCopies.length === 0 || !currentUser) return
    setKioskState('PROCESSING')
    playBeep('success')
    try {
      await borrowSlipApi.create({
        studentId: currentUser.studentId,
        source: 'NFC',
        items: scannedBorrowCopies.map(copy => ({ bookId: copy.bookId, copyId: copy.id })),
      })
      setKioskState('SUCCESS')
      playBeep('success')
    } catch (error: unknown) {
      setTransactionError(getErrorDescription(error))
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // ─── Confirm return ───
  const handleConfirmReturn = async () => {
    if (scannedReturnIds.length === 0) return
    setKioskState('PROCESSING')
    playBeep('success')
    try {
      for (const borrowId of scannedReturnIds) {
        await borrowApi.return(borrowId, 'Trả qua trạm tự phục vụ')
      }
      setKioskState('SUCCESS')
      playBeep('success')
    } catch (error: unknown) {
      setTransactionError(getErrorDescription(error))
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // ─── Session timeout countdown ───
  const handleSessionTimeout = useEffectEvent(() => {
    handleResetKiosk()
    showToast('Lượt mượn/trả đã tự động kết thúc do hết thời gian chờ.', 'warning')
  })

  useEffect(() => {
    if (!isActivated || kioskState === 'WAITING_FOR_USER' || kioskState === 'SUCCESS' || kioskState === 'ERROR' || kioskState === 'PROCESSING') {
      if (timeoutRef.current) clearInterval(timeoutRef.current)
      return
    }
    timeoutRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { handleSessionTimeout(); return 30 }
        return prev - 1
      })
    }, 1000)
    return () => { if (timeoutRef.current) clearInterval(timeoutRef.current) }
  }, [kioskState, isActivated])

  // ─── Auto-reset after success/error ───
  const handleResultTimeout = useEffectEvent(() => handleResetKiosk())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    if (kioskState === 'SUCCESS' || kioskState === 'ERROR') {
      timer = setTimeout(handleResultTimeout, 5000)
    }
    return () => { if (timer) clearTimeout(timer) }
  }, [kioskState])

  // ─── Touch resets countdown ───
  const handleUserInteraction = () => {
    if (kioskState !== 'WAITING_FOR_USER' && kioskState !== 'SUCCESS' && kioskState !== 'ERROR' && kioskState !== 'PROCESSING') {
      setCountdown(30)
    }
  }

  // ─── Activation screen ───
  if (!isActivated) {
    return (
      <div className={`min-h-screen ${k.bg} ${k.text} flex items-center justify-center p-4`}>
        <Card className={`w-full max-w-md bg-white border ${k.border} shadow-md`}>
          <CardHeader className="text-center pb-2">
            <div className={`mx-auto w-12 h-12 ${k.surface} rounded-full flex items-center justify-center ${k.textSubtle} mb-2 border ${k.border}`}>
              <Library className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Kích hoạt trạm tự phục vụ</CardTitle>
            <CardDescription className={k.textMuted}>
              Đăng nhập tài khoản thủ thư hoặc quản trị viên để kích hoạt.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleActivateKiosk}>
            <CardContent className="space-y-4 pt-2">
              {activationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{activationError}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className={`text-sm font-medium ${k.textLabel}`}>Tên đăng nhập</label>
                <Input
                  type="text"
                  required
                  placeholder="Tên đăng nhập thủ thư..."
                  value={activationUsername}
                  onChange={e => setActivationUsername(e.target.value)}
                  className={`${k.border} focus-visible:ring-[var(--kiosk-text-subtle)]`}
                />
              </div>
              <div className="space-y-1">
                <label className={`text-sm font-medium ${k.textLabel}`}>Mật khẩu</label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={activationPassword}
                  onChange={e => setActivationPassword(e.target.value)}
                  className={`${k.border} focus-visible:ring-[var(--kiosk-text-subtle)]`}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={isActivating}
                className="w-full bg-[var(--kiosk-btn-bg)] text-white hover:bg-[var(--kiosk-btn-hover)] transition-colors"
              >
                {isActivating ? 'Đang kích hoạt...' : 'Kích hoạt Kiosk'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // ─── Active kiosk screen ───
  return (
    <div
      className={`min-h-screen ${k.bg} ${k.text} flex flex-col justify-between p-6 select-none relative`}
      onClick={handleUserInteraction}
    >
      {toastMessage && <KioskToastBar toast={toastMessage} />}

      <KioskHeader
        kioskState={kioskState}
        countdown={countdown}
        sseStatus={sseStatus}
        onLogout={logout}
      />

      <main className="flex-1 my-8 flex flex-col items-center justify-center">
        {kioskState === 'WAITING_FOR_USER' && <WaitingForUserView />}

        {kioskState === 'SELECT_MODE' && currentUser && (
          <SelectModeView
            user={currentUser}
            onBorrow={handleSelectBorrow}
            onReturn={handleSelectReturn}
            onCancel={handleResetKiosk}
          />
        )}

        {kioskState === 'SCANNING_BORROW' && currentUser && (
          <ScanningBorrowView
            user={currentUser}
            copies={scannedBorrowCopies}
            onRemoveCopy={id => setScannedBorrowCopies(prev => prev.filter(c => c.id !== id))}
            onConfirm={handleConfirmBorrow}
            onCancel={handleResetKiosk}
            playBeep={playBeep}
          />
        )}

        {kioskState === 'SCANNING_RETURN' && currentUser && (
          <ScanningReturnView
            user={currentUser}
            borrows={activeUserBorrows}
            scannedIds={scannedReturnIds}
            onUnscanReturn={id => setScannedReturnIds(prev => prev.filter(x => x !== id))}
            onConfirm={handleConfirmReturn}
            onCancel={handleResetKiosk}
            playBeep={playBeep}
          />
        )}

        {kioskState === 'PROCESSING' && <ProcessingView mode={activeMode} />}
        {kioskState === 'SUCCESS' && <SuccessView mode={activeMode} />}
        {kioskState === 'ERROR' && <ErrorView message={transactionError} onReset={handleResetKiosk} mode={activeMode} />}
      </main>

      <footer className={`flex justify-between items-center text-xs ${k.textSubtle} border-t ${k.border} pt-4 font-medium uppercase tracking-widest`}>
        <span>© 2026 Awaken Ant Library</span>
        <span>Trạm tự phục vụ v1.2</span>
      </footer>
    </div>
  )
}
