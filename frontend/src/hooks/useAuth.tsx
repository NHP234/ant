import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, type LoginRequest, type RegisterRequest } from '@/api/auth'

interface AuthUser {
  username: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isLibrarian: boolean
  isStudent: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data)
    const { accessToken, refreshToken, user } = res.data.data
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    const authUser = { username: user.username, role: user.role }
    localStorage.setItem('user', JSON.stringify(authUser))
    setUser(authUser)
  }

  const register = async (data: RegisterRequest) => {
    const res = await authApi.register(data)
    const { accessToken, refreshToken, user } = res.data.data
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    const authUser = { username: user.username, role: user.role }
    localStorage.setItem('user', JSON.stringify(authUser))
    setUser(authUser)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'ADMIN',
        isLibrarian: user?.role === 'LIBRARIAN',
        isStudent: user?.role === 'STUDENT',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
