import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const AUTH_API_URL = `${BASE_URL}/api/auth`

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isAdmin: boolean
  authHeaders: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lbl_token'))
  const [loading, setLoading] = useState(true)

  // Fetch current user from token
  const fetchMe = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${AUTH_API_URL}/me`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setUser(json.data)
        return true
      } else {
        // Chỉ xóa token nếu là lỗi xác thực (401 Unauthorized, 403 Forbidden)
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('lbl_token')
          setToken(null)
          setUser(null)
        }
        return false
      }
    } catch {
      return false
    }
  }, [])

  // On mount: verify existing token
  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (json.success) {
        const { token: newToken, user: userData } = json.data
        localStorage.setItem('lbl_token', newToken)
        setToken(newToken)
        setUser(userData)
        return { success: true, message: json.message }
      }
      return { success: false, message: json.message || 'Đăng nhập thất bại' }
    } catch {
      return { success: false, message: 'Không thể kết nối tới server' }
    }
  }

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const json = await res.json()
      if (json.success) {
        // Đăng ký thành công -> trả về true, không đăng nhập tự động
        return { success: true, message: json.message }
      }
      return { success: false, message: json.message || 'Đăng ký thất bại' }
    } catch {
      return { success: false, message: 'Không thể kết nối tới server' }
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('lbl_token')
    setToken(null)
    setUser(null)
  }

  const authHeaders = useCallback((): Record<string, string> => {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }, [token])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, authHeaders }}>
      {children}
    </AuthContext.Provider>
  )
}
