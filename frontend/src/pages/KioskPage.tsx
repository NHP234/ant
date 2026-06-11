import { useState, useEffect, useEffectEvent, useRef } from 'react'
import type { AxiosError } from 'axios'
import { useAuth } from '@/hooks/useAuth'
import { nfcApi } from '@/api/nfc'
import { borrowApi, type BorrowRecord } from '@/api/borrows'
import { borrowSlipApi } from '@/api/borrowSlips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X, ShieldAlert, Wifi, WifiOff, RefreshCw, Library, User as UserIcon, BookOpen, ArrowRightLeft, CreditCard } from 'lucide-react'

// Các trạng thái của Kiosk State Machine
type KioskState = 
  | 'WAITING_FOR_USER'
  | 'SELECT_MODE'
  | 'SCANNING_BORROW'
  | 'SCANNING_RETURN'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR'

// Kiểu dữ liệu nhận được từ event quét thẻ NFC
interface UserData {
  id: number
  username: string
  fullName: string
  studentId: string
  role: string
}

interface BookCopyData {
  id: number
  bookId: number
  copyNumber: number
  nfcTagUid: string
  status: string
  title?: string  // Dành cho hiển thị tiêu đề sách
  conditionNote?: string
}

interface NfcScanEvent {
  type: string
  data: unknown
}

interface ApiErrorResponse {
  message?: string
}

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<ApiErrorResponse>
  return axiosError.response?.data?.message || fallback
}

export default function KioskPage() {
  const { user, login, logout } = useAuth()
  
  // Kiểm tra Kiosk đã kích hoạt chưa (Chỉ Admin hoặc Thủ thư mới kích hoạt được)
  const isActivated = user && (user.role === 'ADMIN' || user.role === 'LIBRARIAN')

  // Trạng thái Form Đăng nhập kích hoạt
  const [activationUsername, setActivationUsername] = useState('')
  const [activationPassword, setActivationPassword] = useState('')
  const [activationError, setActivationError] = useState('')
  const [isActivating, setIsActivating] = useState(false)

  // Kiosk State Machine
  const [kioskState, setKioskState] = useState<KioskState>('WAITING_FOR_USER')
  
  // Dữ liệu người dùng đang quẹt thẻ giao dịch
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)
  
  // Danh sách sách đang quét chờ mượn
  const [scannedBorrowCopies, setScannedBorrowCopies] = useState<BookCopyData[]>([])

  // Danh sách sách đang mượn của user (dành cho chế độ TRẢ)
  const [activeUserBorrows, setActiveUserBorrows] = useState<BorrowRecord[]>([])
  
  // Danh sách ID của các borrow record đã quét để trả
  const [scannedReturnIds, setScannedReturnIds] = useState<number[]>([])

  // Trạng thái kết nối EventSource SSE
  const [sseStatus, setSseStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED')
  
  // Thông điệp Toast/Cảnh báo tạm thời
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null)
  
  // Lỗi khi xử lý nghiệp vụ mượn/trả
  const [transactionError, setTransactionError] = useState('')

  // Bộ đếm thời gian Timeout (giây)
  const [countdown, setCountdown] = useState(30)

  const sseRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Giả lập âm thanh Bíp bíp bằng Web Audio API để tăng tính chân thực ---
  const playBeep = (type: 'success' | 'warn' | 'error') => {
    try {
      const AudioContextClass = window.AudioContext
        || (window as AudioContextWindow).webkitAudioContext
      if (!AudioContextClass) return

      const audioCtx = new AudioContextClass()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      if (type === 'success') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // Tần số cao
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.1) // 100ms
      } else if (type === 'warn') {
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime) // Tần số trung
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.25) // 250ms
      } else {
        // Âm thanh báo lỗi hai tiếng bíp trầm
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
      }
    } catch (e) {
      console.warn('Không thể phát âm thanh bíp giả lập:', e)
    }
  }

  // --- Show thông điệp cảnh báo tạm thời (Toast) ---
  const showToast = (text: string, type: 'success' | 'warning' | 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage({ text, type })
    
    // Phát âm thanh tương ứng
    if (type === 'success') playBeep('success')
    else if (type === 'warning') playBeep('warn')
    else playBeep('error')

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  // --- Kích hoạt thiết bị Kiosk ---
  const handleActivateKiosk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsActivating(true)
    setActivationError('')
    try {
      await login({ username: activationUsername, password: activationPassword })
      showToast('Kích hoạt trạm tự phục vụ thành công!', 'success')
    } catch (error: unknown) {
      setActivationError(getApiErrorMessage(error, 'Tài khoản không hợp lệ hoặc thiếu quyền hạn.'))
      playBeep('error')
    } finally {
      setIsActivating(false)
    }
  }

  // --- Hủy/Reset phiên giao dịch về trạng thái chờ ---
  const handleResetKiosk = () => {
    setCountdown(30)
    setKioskState('WAITING_FOR_USER')
    setCurrentUser(null)
    setScannedBorrowCopies([])
    setScannedReturnIds([])
    setActiveUserBorrows([])
    setTransactionError('')
  }

  // --- Xử lý sự kiện nhận được từ cổng SSE NFC ---
  const handleNfcScanEvent = useEffectEvent((eventData: NfcScanEvent) => {
    setCountdown(30) // Reset bộ đếm ngược 30 giây khi có tương tác NFC

    const { type, data } = eventData

    // Kịch bản 1: Kiosk đang ở màn hình chờ (WAITING_FOR_USER)
    if (kioskState === 'WAITING_FOR_USER') {
      if (type === 'USER') {
        const u = data as UserData
        setCurrentUser(u)
        setKioskState('SELECT_MODE')
        playBeep('success')
      } else {
        // [Cảnh báo quẹt sai thứ tự]: Quẹt sách hoặc thẻ unknown khi chưa quẹt User
        showToast('Vui lòng quẹt thẻ sinh viên trước để bắt đầu giao dịch!', 'warning')
      }
    }
    // Kịch bản 2: Kiosk đang ở màn hình chọn chế độ (SELECT_MODE)
    else if (kioskState === 'SELECT_MODE') {
      if (type === 'USER') {
        // Nếu quẹt thẻ sinh viên khác, chuyển sang sinh viên mới
        const u = data as UserData
        setCurrentUser(u)
        setScannedBorrowCopies([])
        setScannedReturnIds([])
        setActiveUserBorrows([])
        showToast(`Đã chuyển sang sinh viên: ${u.fullName}`, 'success')
      } else {
        showToast('Vui lòng chọn chế độ [Mượn Sách] hoặc [Trả Sách] trên màn hình!', 'warning')
      }
    }
    // Kịch bản 3: Đang trong quá trình quét mượn sách (SCANNING_BORROW)
    else if (kioskState === 'SCANNING_BORROW') {
      if (type === 'USER') {
        const u = data as UserData
        if (u.id === currentUser?.id) {
          showToast('Thẻ sinh viên hiện tại đã được nhận dạng.', 'warning')
        } else {
          showToast('Phiên giao dịch của sinh viên hiện tại đang hoạt động, không thể quẹt thẻ khác!', 'error')
        }
      } else if (type === 'BOOK_COPY') {
        const copy = data as BookCopyData
        
        // Kiểm tra xem cuốn sách này đã có trong danh sách quét chưa
        const isAlreadyAdded = scannedBorrowCopies.some(c => c.id === copy.id)
        if (isAlreadyAdded) {
          showToast('Cuốn sách này đã có trong danh sách quét mượn.', 'warning')
          return
        }

        const isSameBookAdded = scannedBorrowCopies.some(c => c.bookId === copy.bookId)
        if (isSameBookAdded) {
          showToast('Không thể mượn hai bản sao của cùng một đầu sách trong một phiếu.', 'warning')
          return
        }

        if (scannedBorrowCopies.length >= 5) {
          showToast('Mỗi phiếu chỉ được mượn tối đa 5 cuốn.', 'warning')
          return
        }

        // Kiểm tra xem status có khả dụng không
        if (copy.status !== 'AVAILABLE') {
          showToast(`Sách bản sao #${copy.copyNumber} không ở trạng thái sẵn sàng để mượn (Status: ${copy.status}).`, 'error')
          return
        }

        // Thêm sách vào list chờ
        setScannedBorrowCopies(prev => [...prev, copy])
        showToast('Đã quét thêm 1 bản sao sách!', 'success')
      } else {
        showToast('Thẻ NFC này không phải tag sách vật lý hợp lệ.', 'error')
      }
    }
    // Kịch bản 4: Đang trong quá trình quét trả sách (SCANNING_RETURN)
    else if (kioskState === 'SCANNING_RETURN') {
      if (type === 'USER') {
        showToast('Vui lòng quét tag trên sách cần trả, không quét thẻ sinh viên ở bước này!', 'warning')
      } else if (type === 'BOOK_COPY') {
        const copy = data as BookCopyData
        
        // Tìm xem bản sao này có nằm trong danh sách đang mượn của user hay không
        const matchingRecord = activeUserBorrows.find(r => r.copyId === copy.id)
        
        if (!matchingRecord) {
          showToast('Cuốn sách này không thuộc danh sách sách bạn đang mượn!', 'error')
          return
        }

        const isAlreadyScanned = scannedReturnIds.includes(matchingRecord.id)
        if (isAlreadyScanned) {
          showToast('Cuốn sách này đã được quét nhận diện.', 'warning')
          return
        }

        // Đánh dấu đã quét
        setScannedReturnIds(prev => [...prev, matchingRecord.id])
        showToast('Nhận diện bản sách cần trả thành công!', 'success')
      } else {
        showToast('Tag NFC này không phải tag sách đang mượn.', 'error')
      }
    }
  })

  // --- Bắt đầu luồng Mượn Sách ---
  const handleSelectBorrow = () => {
    setCountdown(30)
    setKioskState('SCANNING_BORROW')
    playBeep('success')
  }

  // --- Bắt đầu luồng Trả Sách (Fetch sách đang mượn) ---
  const handleSelectReturn = async () => {
    if (!currentUser) return
    
    setCountdown(30)
    setKioskState('PROCESSING')
    playBeep('success')

    try {
      const res = await borrowApi.getActiveBorrows(currentUser.studentId)
      setActiveUserBorrows(res.data.data)
      setKioskState('SCANNING_RETURN')
    } catch {
      setTransactionError('Không thể lấy danh sách sách đang mượn của bạn.')
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // --- API gọi Xác nhận Mượn Sách hàng loạt ---
  const handleConfirmBorrow = async () => {
    if (scannedBorrowCopies.length === 0 || !currentUser) return
    
    setKioskState('PROCESSING')
    playBeep('success')

    try {
      await borrowSlipApi.create({
        studentId: currentUser.studentId,
        source: 'NFC',
        items: scannedBorrowCopies.map(copy => ({
          bookId: copy.bookId,
          copyId: copy.id,
        })),
      })
      setKioskState('SUCCESS')
      playBeep('success')
    } catch (error: unknown) {
      setTransactionError(getApiErrorMessage(error, 'Quá trình mượn sách thất bại.'))
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // --- API gọi Xác nhận Trả Sách hàng loạt ---
  const handleConfirmReturn = async () => {
    if (scannedReturnIds.length === 0) return

    setKioskState('PROCESSING')
    playBeep('success')

    try {
      // Thực hiện trả từng cuốn sách dựa trên borrow record id
      for (const borrowId of scannedReturnIds) {
        await borrowApi.return(borrowId, 'Returned via Self-Service Kiosk')
      }
      setKioskState('SUCCESS')
      playBeep('success')
    } catch (error: unknown) {
      setTransactionError(getApiErrorMessage(error, 'Quá trình trả sách thất bại.'))
      setKioskState('ERROR')
      playBeep('error')
    }
  }

  // --- Hook quản lý kết nối và ngắt kết nối SSE khi mount/unmount ---
  useEffect(() => {
    if (!isActivated) {
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
      return
    }

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const connectSSE = () => {
      if (sseRef.current) {
        sseRef.current.close()
      }

      setSseStatus('CONNECTING')
      const source = new EventSource(nfcApi.getStreamUrl())
      sseRef.current = source

      source.onopen = () => {
        setSseStatus('CONNECTED')
      }

      source.addEventListener('nfc-scan', (event: MessageEvent) => {
        try {
          handleNfcScanEvent(JSON.parse(event.data) as NfcScanEvent)
        } catch (error) {
          console.error('Lỗi parse JSON NFC event:', error)
        }
      })

      source.onerror = () => {
        setSseStatus('DISCONNECTED')
        source.close()
        if (!disposed) {
          reconnectTimeout = setTimeout(connectSSE, 5000)
        }
      }
    }

    connectSSE()

    return () => {
      disposed = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
    }
  }, [isActivated])

  const handleSessionTimeout = useEffectEvent(() => {
    handleResetKiosk()
    showToast('Phiên giao dịch đã tự động kết thúc do hết thời gian chờ.', 'warning')
  })

  // --- Hook quản lý đếm ngược Timeout 30 giây ---
  useEffect(() => {
    if (!isActivated || kioskState === 'WAITING_FOR_USER' || kioskState === 'SUCCESS' || kioskState === 'ERROR' || kioskState === 'PROCESSING') {
      if (timeoutRef.current) clearInterval(timeoutRef.current)
      return
    }

    timeoutRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleSessionTimeout()
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current)
    }
  }, [kioskState, isActivated])

  // Tự động reset màn hình thành công/lỗi sau 5 giây
  const handleResultTimeout = useEffectEvent(() => {
    handleResetKiosk()
  })

  useEffect(() => {
    let successTimer: ReturnType<typeof setTimeout> | null = null
    if (kioskState === 'SUCCESS' || kioskState === 'ERROR') {
      successTimer = setTimeout(() => {
        handleResultTimeout()
      }, 5000)
    }
    return () => {
      if (successTimer) clearTimeout(successTimer)
    }
  }, [kioskState])

  // Click bất kỳ trên màn hình đều làm mới bộ đếm thời gian
  const handleUserInteraction = () => {
    if (kioskState !== 'WAITING_FOR_USER' && kioskState !== 'SUCCESS' && kioskState !== 'ERROR' && kioskState !== 'PROCESSING') {
      setCountdown(30)
    }
  }

  // Màn hình khóa yêu cầu kích hoạt trạm tự phục vụ
  if (!isActivated) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#1A1F26] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border border-[#E1DEC9] shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-[#FAF8EE] rounded-full flex items-center justify-center text-[#968F71] mb-2 border border-[#E1DEC9]">
              <Library className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl font-bold tracking-tight">Kích hoạt Trạm tự phục vụ</CardTitle>
            <CardDescription className="text-[#6E6855]">
              Vui lòng đăng nhập tài khoản Thủ thư hoặc Admin để kích hoạt Kiosk.
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
                <label className="text-sm font-medium text-[#4C4738]">Tên đăng nhập</label>
                <Input
                  type="text"
                  required
                  placeholder="Tên đăng nhập thủ thư..."
                  value={activationUsername}
                  onChange={e => setActivationUsername(e.target.value)}
                  className="border-[#E1DEC9] focus-visible:ring-[#968F71]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#4C4738]">Mật khẩu</label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={activationPassword}
                  onChange={e => setActivationPassword(e.target.value)}
                  className="border-[#E1DEC9] focus-visible:ring-[#968F71]"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isActivating}
                className="w-full bg-[#1A1F26] text-white hover:bg-[#2C323B] transition-colors"
              >
                {isActivating ? 'Đang kích hoạt...' : 'Kích hoạt Kiosk'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // MÀN HÌNH HOẠT ĐỘNG CHÍNH CỦA KIOSK
  return (
    <div 
      className="min-h-screen bg-[#FDFBF7] text-[#1A1F26] flex flex-col justify-between p-6 select-none relative"
      onClick={handleUserInteraction}
    >
      {/* Toast Alert nổi trên màn hình */}
      {toastMessage && (
        <div 
          className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg border text-lg font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success' 
              ? 'bg-[#F2FAF5] border-[#D4EFDF] text-[#1E8449]' 
              : toastMessage.type === 'warning'
              ? 'bg-[#FEF5E7] border-[#FADBD8] text-[#D35400]'
              : 'bg-[#FDEDEC] border-[#FADBD8] text-[#C0392B]'
          }`}
        >
          {toastMessage.type === 'success' && <Check className="w-6 h-6 shrink-0" />}
          {toastMessage.type === 'warning' && <ShieldAlert className="w-6 h-6 shrink-0" />}
          {toastMessage.type === 'error' && <X className="w-6 h-6 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header của Kiosk */}
      <header className="flex justify-between items-center border-b border-[#FAF6EC] pb-4">
        <div className="flex items-center gap-3">
          <Library className="w-8 h-8 text-[#968F71]" />
          <div>
            <h2 className="font-serif text-xl font-bold tracking-tight">Thư viện Awaken Ant</h2>
            <p className="text-xs text-[#968F71] uppercase tracking-widest font-semibold">Trạm tự phục vụ (Self-Service Kiosk)</p>
          </div>
        </div>

        {/* Cổng indicator kết nối SSE NFC Reader */}
        <div className="flex items-center gap-4">
          {kioskState !== 'WAITING_FOR_USER' && (
            <div className="px-3 py-1 bg-[#FAF6EC] rounded-full text-xs font-semibold text-[#968F71] flex items-center gap-2 border border-[#E1DEC9]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Phiên kết thúc sau: {countdown}s</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E1DEC9] text-xs font-medium shadow-sm">
            {sseStatus === 'CONNECTED' ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                  <Wifi className="w-3.5 h-3.5" /> Reader Online
                </span>
              </>
            ) : sseStatus === 'CONNECTING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span className="text-amber-700 font-semibold">Đang kết nối lại...</span>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                <span className="text-rose-700 flex items-center gap-1 font-semibold">
                  <WifiOff className="w-3.5 h-3.5" /> Reader Offline
                </span>
              </>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={logout}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100"
          >
            Đóng Kiosk
          </Button>
        </div>
      </header>

      {/* Main Content Area - Xử lý State Machine */}
      <main className="flex-1 my-8 flex flex-col items-center justify-center">
        
        {/* STATE 1: WAITING_FOR_USER */}
        {kioskState === 'WAITING_FOR_USER' && (
          <div className="text-center space-y-8 max-w-xl animate-in fade-in duration-500">
            <div className="relative mx-auto w-40 h-40 bg-white border border-[#E1DEC9] rounded-full flex items-center justify-center shadow-lg">
              {/* Hoạt ảnh sóng NFC lan tỏa */}
              <div className="absolute inset-0 rounded-full border border-dashed border-[#CFCAB2] animate-ping opacity-25"></div>
              <div className="absolute inset-4 rounded-full border border-dashed border-[#CFCAB2] animate-ping opacity-50 duration-1000"></div>
              <CreditCard className="w-20 h-20 text-[#968F71] animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#1A1F26] leading-tight">
                Vui lòng quẹt thẻ sinh viên
              </h1>
              <p className="text-lg text-[#6E6855] font-medium tracking-wide">
                Đưa thẻ định danh của bạn lại gần đầu đọc NFC để bắt đầu giao dịch mượn/trả sách tự phục vụ.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-6 text-[#968F71] text-sm font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Nhanh chóng</span>
              <span className="w-1.5 h-1.5 bg-[#FAF6EC] rounded-full"></span>
              <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Tự động</span>
              <span className="w-1.5 h-1.5 bg-[#FAF6EC] rounded-full"></span>
              <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Tiện lợi</span>
            </div>
          </div>
        )}

        {/* STATE 2: SELECT_MODE */}
        {kioskState === 'SELECT_MODE' && currentUser && (
          <div className="w-full max-w-4xl space-y-10 animate-in fade-in duration-500">
            <div className="bg-white border border-[#E1DEC9] p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#FAF6EC] border border-[#E1DEC9] rounded-xl flex items-center justify-center text-[#968F71]">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xs text-[#968F71] uppercase tracking-widest font-bold">Xin chào, sinh viên</h3>
                  <h2 className="font-serif text-2xl font-bold">{currentUser.fullName}</h2>
                  <p className="text-sm text-[#6E6855] font-medium">Mã sinh viên: {currentUser.studentId}</p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={handleResetKiosk}
                className="border-[#E1DEC9] hover:bg-[#FAF6EC] text-[#6E6855]"
              >
                Hủy phiên
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Lựa chọn MƯỢN SÁCH */}
              <button
                type="button"
                data-testid="kiosk-select-borrow"
                onClick={handleSelectBorrow}
                className="group cursor-pointer bg-white border border-[#E1DEC9] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-[#968F71] transition-all duration-300 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-[#F2FAF5] border border-[#D4EFDF] rounded-full flex items-center justify-center text-[#1E8449] group-hover:scale-110 transition-transform">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl font-extrabold text-[#1A1F26]">Mượn Sách</h3>
                  <p className="text-[#6E6855] font-medium">Đăng ký mượn mới các sách bạn mong muốn tại quầy tự phục vụ.</p>
                </div>
              </button>

              {/* Lựa chọn TRẢ SÁCH */}
              <button
                type="button"
                data-testid="kiosk-select-return"
                onClick={handleSelectReturn}
                className="group cursor-pointer bg-white border border-[#E1DEC9] rounded-2xl p-8 shadow-sm hover:shadow-lg hover:border-[#968F71] transition-all duration-300 flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-[#FAF6EC] border border-[#E1DEC9] rounded-full flex items-center justify-center text-[#968F71] group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-3xl font-extrabold text-[#1A1F26]">Trả Sách</h3>
                  <p className="text-[#6E6855] font-medium">Trả lại sách đã mượn bằng cách quét nhận dạng tag dán trên bìa sách.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: SCANNING_BORROW (Mượn sách) */}
        {kioskState === 'SCANNING_BORROW' && currentUser && (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#EBF5FB] border border-[#AED6F1] p-6 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#2980B9] shadow-sm border border-[#AED6F1]">
                  <BookOpen className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs text-[#2980B9] uppercase tracking-widest font-bold">Chế độ</h4>
                  <h2 className="font-serif text-xl font-bold text-[#1F618D]">Đang quét sách cần mượn</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#566573]">Sinh viên: {currentUser.fullName}</p>
                <p className="text-xs text-[#85929E]">Quẹt lần lượt từng cuốn sách vào đầu đọc</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-[#E1DEC9] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[350px]">
                <div className="bg-[#FAF8EE] px-6 py-4 border-b border-[#E1DEC9] flex justify-between items-center">
                  <span className="font-semibold text-sm text-[#4C4738]">Danh sách sách đã quét ({scannedBorrowCopies.length})</span>
                  <span className="text-xs text-[#968F71] font-semibold uppercase tracking-wider">Mượn tối đa: 5 cuốn</span>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {scannedBorrowCopies.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12 text-[#968F71]">
                      <CreditCard className="w-12 h-12 stroke-[1.5] animate-bounce" />
                      <p className="font-serif text-lg font-medium text-[#4C4738]">Chưa có sách nào được quét</p>
                      <p className="text-sm max-w-xs">Nhẹ nhàng đặt tag dán trên bìa sau của cuốn sách lại gần đầu đọc NFC.</p>
                    </div>
                  ) : (
                    scannedBorrowCopies.map((copy, index) => (
                      <div 
                        key={copy.id}
                        className="p-4 bg-[#FAFBFB] border border-[#E5E8E8] rounded-xl flex items-center justify-between hover:border-[#968F71] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="font-serif font-bold text-[#1A1F26]">{copy.title || `Bản sao sách #${copy.id}`}</h4>
                            <p className="text-xs text-[#6E6855]">Số hiệu bản sao: #{copy.copyNumber} | Tag UID: {copy.nfcTagUid}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setScannedBorrowCopies(prev => prev.filter(c => c.id !== copy.id))
                            playBeep('warn')
                          }}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hướng dẫn thao tác */}
              <div className="bg-[#FAF8EE] border border-[#E1DEC9] rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#4C4738] border-b border-[#E1DEC9] pb-2">Hướng dẫn</h3>
                  <ul className="space-y-3 text-sm text-[#6E6855] font-medium">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <span>Quét tag NFC dán ở mặt sau của sách.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <span>Kiểm tra xem tên sách và số hiệu bản sao có chính xác trên bảng không.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                      <span>Nhấn nút [Hoàn tất mượn] để hệ thống kích hoạt hạn trả (14 ngày).</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 pt-6">
                  <Button 
                    onClick={handleConfirmBorrow}
                    disabled={scannedBorrowCopies.length === 0}
                    className="w-full bg-[#1E8449] hover:bg-[#196F3D] text-white py-6 text-lg font-bold shadow-sm"
                  >
                    Hoàn tất mượn ({scannedBorrowCopies.length} sách)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResetKiosk}
                    className="w-full border-[#E1DEC9] hover:bg-[#FAF6EC] text-[#6E6855]"
                  >
                    Hủy phiên giao dịch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 4: SCANNING_RETURN (Trả sách) */}
        {kioskState === 'SCANNING_RETURN' && currentUser && (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#FCF3CF] border border-[#F9E79F] p-6 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#B7950B] shadow-sm border border-[#F9E79F]">
                  <ArrowRightLeft className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs text-[#B7950B] uppercase tracking-widest font-bold">Chế độ</h4>
                  <h2 className="font-serif text-xl font-bold text-[#7D6608]">Đang quét sách cần trả</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#566573]">Sinh viên: {currentUser.fullName}</p>
                <p className="text-xs text-[#85929E]">Đặt sách đang mượn lên đầu đọc NFC</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-[#E1DEC9] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[350px]">
                <div className="bg-[#FAF8EE] px-6 py-4 border-b border-[#E1DEC9] flex justify-between items-center">
                  <span className="font-semibold text-sm text-[#4C4738]">Danh sách sách bạn đang mượn ({activeUserBorrows.length})</span>
                  <span className="text-xs text-[#B7950B] font-bold uppercase tracking-wider">
                    Đã quét trả: {scannedReturnIds.length} / {activeUserBorrows.length}
                  </span>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {activeUserBorrows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12 text-[#968F71]">
                      <Check className="w-12 h-12 stroke-[1.5] text-emerald-500 bg-[#E8F8F5] p-2.5 rounded-full border border-[#D1F2EB]" />
                      <p className="font-serif text-lg font-bold text-[#4C4738]">Không có sách nào cần trả</p>
                      <p className="text-sm max-w-xs">Hồ sơ của bạn hiện tại không ghi nhận bất kỳ sách nào chưa trả.</p>
                    </div>
                  ) : (
                    activeUserBorrows.map((record) => {
                      const isScanned = scannedReturnIds.includes(record.id)
                      return (
                        <div 
                          key={record.id}
                          className={`p-4 border rounded-xl flex items-center justify-between transition-colors ${
                            isScanned 
                              ? 'bg-[#E8F8F5] border-[#D1F2EB] text-[#1E8449]' 
                              : 'bg-[#FAFBFB] border-[#E5E8E8] text-[#1A1F26]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm ${
                              isScanned 
                                ? 'bg-[#D1F2EB] border-[#A3E4D7] text-[#1E8449]' 
                                : 'bg-[#FAF6EC] border-[#E1DEC9] text-[#968F71]'
                            }`}>
                              {isScanned ? <Check className="w-4 h-4" /> : record.copyNumber}
                            </div>
                            <div>
                              <h4 className="font-serif font-bold">{record.bookTitle}</h4>
                              <p className={`text-xs ${isScanned ? 'text-[#2ECC71]' : 'text-[#6E6855]'}`}>
                                Tác giả: {record.bookAuthor} | Hạn trả: {new Date(record.dueDate).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isScanned ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setScannedReturnIds(prev => prev.filter(id => id !== record.id))
                                  playBeep('warn')
                                }}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100"
                              >
                                Bỏ quét
                              </Button>
                            ) : (
                              <span className="text-xs font-semibold px-2.5 py-1 bg-[#FADBD8] border border-[#F5B7B1] text-rose-700 rounded-full">
                                Đang chờ quét tag...
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Hướng dẫn thao tác */}
              <div className="bg-[#FAF8EE] border border-[#E1DEC9] rounded-2xl p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#4C4738] border-b border-[#E1DEC9] pb-2">Hướng dẫn</h3>
                  <ul className="space-y-3 text-sm text-[#6E6855] font-medium">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                      <span>Quét bìa sau cuốn sách muốn trả.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                      <span>Bản sao tương ứng sẽ chuyển sang màu xanh lục.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-[#FAF6EC] border border-[#E1DEC9] text-[#968F71] rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                      <span>Bấm [Hoàn tất trả sách] để ghi nhận và cập nhật CSDL.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3 pt-6">
                  <Button 
                    onClick={handleConfirmReturn}
                    disabled={scannedReturnIds.length === 0}
                    className="w-full bg-[#D4AC0D] hover:bg-[#B7950B] text-white py-6 text-lg font-bold shadow-sm"
                  >
                    Hoàn tất trả ({scannedReturnIds.length} sách)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResetKiosk}
                    className="w-full border-[#E1DEC9] hover:bg-[#FAF6EC] text-[#6E6855]"
                  >
                    Hủy phiên giao dịch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 5: PROCESSING (Đang gửi API xử lý) */}
        {kioskState === 'PROCESSING' && (
          <div className="text-center space-y-6 py-12 animate-in fade-in duration-300">
            <RefreshCw className="w-16 h-16 text-[#968F71] animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold">Đang xử lý giao dịch...</h2>
              <p className="text-[#6E6855] text-sm font-medium">Hệ thống đang đồng bộ và cập nhật cơ sở dữ liệu thư viện.</p>
            </div>
          </div>
        )}

        {/* STATE 6: SUCCESS (Giao dịch thành công) */}
        {kioskState === 'SUCCESS' && (
          <div className="text-center space-y-6 py-12 max-w-md animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-[#E8F8F5] border border-[#A3E4D7] rounded-full flex items-center justify-center text-[#1E8449] shadow-md">
              <Check className="w-14 h-14 animate-bounce" />
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-3xl font-extrabold text-[#1E8449]">Giao dịch Thành công!</h2>
              <p className="text-lg text-[#566573] font-medium leading-relaxed">
                Hệ thống đã cập nhật thành công CSDL. Thông báo xác nhận và chi tiết hạn trả đã được gửi vào tài khoản cá nhân của bạn.
              </p>
            </div>
            <p className="text-xs text-[#95A5A6] font-semibold pt-4">Màn hình sẽ tự động quay về trạng thái chờ sau vài giây...</p>
          </div>
        )}

        {/* STATE 7: ERROR (Giao dịch thất bại) */}
        {kioskState === 'ERROR' && (
          <div className="text-center space-y-6 py-12 max-w-md animate-in zoom-in duration-500">
            <div className="mx-auto w-24 h-24 bg-[#FDEDEC] border border-[#FADBD8] rounded-full flex items-center justify-center text-[#C0392B] shadow-md">
              <ShieldAlert className="w-14 h-14 animate-pulse" />
            </div>
            <div className="space-y-3">
              <h2 className="font-serif text-3xl font-extrabold text-[#C0392B]">Giao dịch thất bại</h2>
              <p className="text-lg text-rose-700 font-medium leading-relaxed">
                {transactionError || 'Đã có lỗi xảy ra trong quá trình kết nối dữ liệu. Vui lòng liên hệ thủ thư.'}
              </p>
            </div>
            <div className="flex gap-4 justify-center pt-4">
              <Button 
                onClick={handleResetKiosk}
                className="bg-[#1A1F26] text-white hover:bg-[#2C323B]"
              >
                Quay lại màn chờ
              </Button>
            </div>
          </div>
        )}

      </main>

      {/* Footer của Kiosk */}
      <footer className="flex justify-between items-center text-xs text-[#968F71] border-t border-[#FAF6EC] pt-4 font-medium uppercase tracking-widest">
        <span>© 2026 Awaken Ant Library. All rights reserved.</span>
        <span>Hệ thống IoT Kiosk tự phục vụ v1.2</span>
      </footer>
    </div>
  )
}
