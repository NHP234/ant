import type { AxiosError } from 'axios'

interface ErrorInfo {
  title: string
  description: string
  action?: string
}

/**
 * Known backend error message patterns → user-friendly Vietnamese messages.
 * The keys are substrings matched against `error.response.data.message`.
 */
const ERROR_MAP: Record<string, ErrorInfo> = {
  'already has an active borrow': {
    title: 'Đã mượn cuốn này',
    description: 'Bạn đang mượn cuốn sách này rồi.',
    action: 'Kiểm tra trong mục "Tủ sách của tôi".',
  },
  'already has an active hold': {
    title: 'Đã đặt trước cuốn này',
    description: 'Bạn đã có yêu cầu đặt trước cho cuốn sách này.',
    action: 'Kiểm tra trong mục "Đặt trước" của bạn.',
  },
  'hold has expired': {
    title: 'Đặt trước đã hết hạn',
    description: 'Yêu cầu đặt trước này đã quá thời hạn 24 giờ.',
    action: 'Vui lòng đặt lại nếu sách còn sẵn.',
  },
  'No available copy': {
    title: 'Không còn sách sẵn',
    description: 'Hiện tại không có bản sao nào khả dụng cho cuốn sách này.',
    action: 'Bạn có thể đặt trước để được thông báo khi có sách.',
  },
  'User is banned from placing holds': {
    title: 'Tạm ngừng dịch vụ đặt trước',
    description: 'Tài khoản của bạn đang bị tạm ngừng quyền đặt trước.',
    action: 'Vui lòng liên hệ thủ thư để biết thêm chi tiết.',
  },
  'Borrow limit exceeded': {
    title: 'Đã đạt giới hạn mượn',
    description: 'Bạn đã mượn tối đa số sách cho phép.',
    action: 'Trả bớt sách để có thể mượn thêm.',
  },
  'not found': {
    title: 'Không tìm thấy',
    description: 'Dữ liệu bạn yêu cầu không tồn tại hoặc đã bị xóa.',
  },
  'Access denied': {
    title: 'Không có quyền truy cập',
    description: 'Bạn không có quyền thực hiện thao tác này.',
  },
  'Username already exists': {
    title: 'Tên đăng nhập đã tồn tại',
    description: 'Vui lòng chọn tên đăng nhập khác.',
  },
  'Email already exists': {
    title: 'Email đã được sử dụng',
    description: 'Vui lòng sử dụng email khác.',
  },
  'Invalid credentials': {
    title: 'Thông tin đăng nhập không đúng',
    description: 'Vui lòng kiểm tra lại tên đăng nhập và mật khẩu.',
  },
  'Copy is not available': {
    title: 'Bản sao không khả dụng',
    description: 'Bản sao này hiện không ở trạng thái sẵn sàng cho mượn.',
  },
  'is not BORROWING': {
    title: 'Không thể trả sách này',
    description: 'Bản ghi mượn này không ở trạng thái đang mượn.',
  },
}

const FALLBACK: ErrorInfo = {
  title: 'Đã có lỗi xảy ra',
  description: 'Vui lòng thử lại sau hoặc liên hệ thủ thư nếu lỗi tiếp tục.',
}

/**
 * Extract a user-friendly error message from an Axios error response.
 * Matches backend `message` field against known patterns.
 */
export function getErrorMessage(error: unknown): ErrorInfo {
  const axiosError = error as AxiosError<{ message?: string }>
  const serverMessage = axiosError?.response?.data?.message

  if (serverMessage) {
    for (const [pattern, info] of Object.entries(ERROR_MAP)) {
      if (serverMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return info
      }
    }
    // If server message is short and readable (< 100 chars), use it as description
    if (serverMessage.length < 100 && !serverMessage.includes('Exception')) {
      return { title: 'Thao tác không thành công', description: serverMessage }
    }
  }

  return FALLBACK
}

/**
 * Get a simple error description string (for toast.error one-liner usage).
 */
export function getErrorDescription(error: unknown): string {
  const info = getErrorMessage(error)
  return info.action ? `${info.description} ${info.action}` : info.description
}
