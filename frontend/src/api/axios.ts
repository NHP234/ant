import axios from 'axios'

const defaultBaseURL = import.meta.env.PROD ? '/api' : 'http://localhost:8080/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Hàng đợi lưu các request đang chờ refresh token xong
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Trình bảo vệ chống vòng lặp vô hạn nếu chính API refresh bị lỗi 401/403
    if (originalRequest.url?.includes('/auth/refresh')) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Spring Security của bạn trả về 403 Forbidden khi Token hết hạn/không hợp lệ
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      
      if (isRefreshing) {
        // Nếu đang trong tiến trình làm mới token, đẩy request này vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          // Gọi API làm mới token ngầm
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          )
          
          const newToken = data.data.accessToken
          const newRefreshToken = data.data.refreshToken
          
          localStorage.setItem('access_token', newToken)
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken)
          }

          // Cập nhật header Authorization cho các request tiếp theo
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          // Giải phóng hàng đợi, thực thi lại toàn bộ request bị kẹt với token mới
          processQueue(null, newToken)
          
          isRefreshing = false
          return api(originalRequest)
        } catch (refreshError) {
          // Lỗi khi làm mới -> Hủy bỏ, giải phóng hàng đợi và đá về trang Login
          processQueue(refreshError, null)
          isRefreshing = false
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
