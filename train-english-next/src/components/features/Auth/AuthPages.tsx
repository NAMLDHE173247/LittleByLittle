import React, { useState } from 'react'
import { useAuth } from '@/AuthContext'
import './AuthPages.css'

interface AuthPagesProps {
  darkMode: boolean
}

export function LoginPage({ darkMode }: AuthPagesProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  if (showRegister) {
    return <RegisterPage darkMode={darkMode} onBack={() => setShowRegister(false)} />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    setLoading(true)
    const result = await login(email.trim(), password)
    if (!result.success) {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className={`auth-page ${darkMode ? 'dark' : ''}`}>
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
      </div>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="auth-logo-icon">📚</span>
              <h1 className="auth-title">LittleByLittle</h1>
            </div>
            <p className="auth-subtitle">Đăng nhập để tiếp tục học tập</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="auth-error-icon">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Mật khẩu</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Chưa có tài khoản?</span>
            <button className="auth-link" onClick={() => setShowRegister(true)}>
              Đăng ký ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RegisterPageProps extends AuthPagesProps {
  onBack: () => void
}

export function RegisterPage({ darkMode, onBack }: RegisterPageProps) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    const result = await register(name.trim(), email.trim(), password)
    if (!result.success) {
      setError(result.message)
    } else {
      // Đăng ký thành công, thông báo cho người dùng biết cần chờ duyệt
      alert(result.message || "Đăng ký thành công! Vui lòng chờ admin duyệt tài khoản.")
      onBack() // Chuyển về màn hình đăng nhập
    }
    setLoading(false)
  }

  return (
    <div className={`auth-page ${darkMode ? 'dark' : ''}`}>
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-orb auth-bg-orb-3" />
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <span className="auth-logo-icon">📚</span>
              <h1 className="auth-title">LittleByLittle</h1>
            </div>
            <p className="auth-subtitle">Tạo tài khoản mới</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="auth-error-icon">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="reg-name">Tên hiển thị</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tên của bạn"
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Mật khẩu</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự, gồm hoa, thường, số, ký tự đặc biệt"
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-confirm">Xác nhận mật khẩu</label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Đã có tài khoản?</span>
            <button className="auth-link" onClick={onBack}>
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
