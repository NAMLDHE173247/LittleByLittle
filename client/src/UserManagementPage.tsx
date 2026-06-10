import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'

const API_URL = 'http://localhost:5000/api/users'

interface User {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
}

export default function UserManagementPage({ darkMode }: { darkMode: boolean }) {
  const { user: currentUser, authHeaders } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch(API_URL, { headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        setUsers(json.data)
      } else {
        setError(json.message)
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: newStatus })
      })
      const json = await res.json()
      if (json.success) {
        setUsers(users.map(u => u._id === id ? { ...u, status: newStatus } : u))
      } else {
        alert(json.message)
      }
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái')
    }
  }

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ role: newRole })
      })
      const json = await res.json()
      if (json.success) {
        setUsers(users.map(u => u._id === id ? { ...u, role: newRole } : u))
      } else {
        alert(json.message)
      }
    } catch (err) {
      alert('Lỗi khi cập nhật vai trò')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá người dùng này? Thao tác này không thể hoàn tác.')) return
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      const json = await res.json()
      if (json.success) {
        setUsers(users.filter(u => u._id !== id))
      } else {
        alert(json.message)
      }
    } catch (err) {
      alert('Lỗi khi xoá người dùng')
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="content">
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Truy cập bị từ chối</h2>
          <p>Bạn không có quyền xem trang này.</p>
        </div>
      </div>
    )
  }

  // Thống kê
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'active').length
  const pendingUsers = users.filter(u => u.status === 'pending').length
  const rejectedUsers = users.filter(u => u.status === 'rejected').length

  const statCards = [
    { label: 'Tổng người dùng', value: totalUsers, icon: <UsersIcon style={{ width: 24, height: 24 }} />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Đã duyệt', value: activeUsers, icon: <ShieldCheckIcon style={{ width: 24, height: 24 }} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Chờ duyệt', value: pendingUsers, icon: <ClockIcon style={{ width: 24, height: 24 }} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Đã khoá', value: rejectedUsers, icon: <NoSymbolIcon style={{ width: 24, height: 24 }} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  ]

  const isSelf = (id: string) => id === currentUser?.id

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý người dùng</h1>
          <p className="page-subtitle">Quản lý tài khoản, duyệt đăng ký mới và phân quyền.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card table-card">
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>TÊN / EMAIL</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>NGÀY ĐĂNG KÝ</th>
                  <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name}
                        {isSelf(u._id) && <span style={{ marginLeft: 8, fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 4 }}>Bạn</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td>
                      {isSelf(u._id) ? (
                        <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                          {u.role.toUpperCase()}
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleUpdateRole(u._id, e.target.value)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            background: u.role === 'admin' ? 'rgba(139,92,246,0.1)' : 'var(--bg-input, #f8fafc)',
                            color: u.role === 'admin' ? '#8b5cf6' : 'var(--text-secondary)',
                            outline: 'none',
                          }}
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {isSelf(u._id) ? (
                        <span style={{ color: '#10b981', fontWeight: 600, fontSize: 13 }}>● Đã duyệt</span>
                      ) : (
                        <select
                          value={u.status}
                          onChange={e => handleUpdateStatus(u._id, e.target.value)}
                          style={{
                            padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            background: u.status === 'active' ? 'rgba(16,185,129,0.1)' : u.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                            color: u.status === 'active' ? '#10b981' : u.status === 'pending' ? '#f59e0b' : '#ef4444',
                            outline: 'none',
                          }}
                        >
                          <option value="active">✓ Đã duyệt</option>
                          <option value="pending">◷ Chờ duyệt</option>
                          <option value="rejected">✕ Đã khoá</option>
                        </select>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isSelf(u._id) && (
                        <button
                          className="btn-outline"
                          onClick={() => handleDelete(u._id)}
                          title="Xoá vĩnh viễn"
                          style={{ padding: '6px', color: '#ef4444', borderColor: '#ef4444' }}
                        >
                          <TrashIcon style={{ width: 18, height: 18 }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
