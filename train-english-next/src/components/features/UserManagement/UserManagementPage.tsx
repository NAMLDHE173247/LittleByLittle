import { useState, useEffect } from 'react'
import { useAuth } from '@/AuthContext'
import {
  TrashIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  UserPlusIcon,
  XMarkIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

const BASE_URL = ''
const API_URL = `${BASE_URL}/api/users`

interface User {
  _id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  streak?: number
  lastStudyDate?: string
}

export default function UserManagementPage({ darkMode }: { darkMode: boolean }) {
  const { user: currentUser, authHeaders } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  const PASSWORD_ERROR_MSG = 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&)'
  const DEFAULT_PASSWORD = 'User@1234!'

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: DEFAULT_PASSWORD, role: 'user', status: 'active' })
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ _id: '', name: '', email: '', password: '', role: 'user', status: 'active' })
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  const [showViewModal, setShowViewModal] = useState(false)
  const [viewUser, setViewUser] = useState<User | null>(null)

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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setAddError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    if (!PASSWORD_REGEX.test(addForm.password)) {
      setAddError(PASSWORD_ERROR_MSG)
      return
    }
    setAddError('')
    setAdding(true)
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(addForm)
      })
      const json = await res.json()
      if (json.success) {
        setShowAddModal(false)
        setAddForm({ name: '', email: '', password: DEFAULT_PASSWORD, role: 'user', status: 'active' })
        fetchUsers()
      } else {
        setAddError(json.message)
      }
    } catch (err) {
      setAddError('Lỗi kết nối khi thêm người dùng')
    } finally {
      setAdding(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    if (editForm.password.trim() && !PASSWORD_REGEX.test(editForm.password)) {
      setEditError(PASSWORD_ERROR_MSG)
      return
    }
    setEditError('')
    setEditing(true)
    try {
      const res = await fetch(`${API_URL}/${editForm._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(editForm)
      })
      const json = await res.json()
      if (json.success) {
        setShowEditModal(false)
        fetchUsers()
      } else {
        setEditError(json.message)
      }
    } catch (err) {
      setEditError('Lỗi kết nối khi sửa người dùng')
    } finally {
      setEditing(false)
    }
  }

  const openEditModal = (u: User) => {
    setEditForm({ _id: u._id, name: u.name, email: u.email, password: '', role: u.role, status: u.status })
    setEditError('')
    setShowEditModal(true)
  }

  const openViewModal = (u: User) => {
    setViewUser(u)
    setShowViewModal(true)
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
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlusIcon className="icon icon-inline" /> Thêm tài khoản
          </button>
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
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        className="btn-outline"
                        onClick={() => openViewModal(u)}
                        title="Xem chi tiết"
                        style={{ padding: '6px', color: '#6366f1', borderColor: '#6366f1' }}
                      >
                        <EyeIcon style={{ width: 18, height: 18 }} />
                      </button>
                      <button
                        className="btn-outline"
                        onClick={() => openEditModal(u)}
                        title="Chỉnh sửa"
                        style={{ padding: '6px', color: '#f59e0b', borderColor: '#f59e0b' }}
                      >
                        <PencilIcon style={{ width: 18, height: 18 }} />
                      </button>
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Thêm tài khoản mới</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <XMarkIcon className="icon" />
              </button>
            </div>
            <div className="modal-body">
              {addError && <div className="auth-error" style={{ marginBottom: 16 }}>{addError}</div>}
              <form onSubmit={handleAddUser} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-group">
                  <label>Tên hiển thị <span className="required">*</span></label>
                  <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Nhập tên" autoFocus />
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Mật khẩu <span className="required">*</span></label>
                  <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} placeholder="Mật khẩu" />
                  <small style={{ color: 'var(--text-secondary)' }}>Mặc định là User@1234! — phải có chữ hoa, thường, số và ký tự đặc biệt.</small>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Vai trò</label>
                    <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                      <option value="user">Người dùng (USER)</option>
                      <option value="admin">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}>
                      <option value="active">Đã duyệt (Active)</option>
                      <option value="pending">Chờ duyệt (Pending)</option>
                      <option value="rejected">Bị khoá (Rejected)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer" style={{ marginTop: 24, padding: 0 }}>
                  <button type="button" className="btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                  <button type="submit" className="btn-primary" disabled={adding}>
                    {adding ? 'Đang thêm...' : 'Thêm tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chỉnh sửa người dùng</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <XMarkIcon className="icon" />
              </button>
            </div>
            <div className="modal-body">
              {editError && <div className="auth-error" style={{ marginBottom: 16 }}>{editError}</div>}
              <form onSubmit={handleEditUser} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="form-group">
                  <label>Tên hiển thị <span className="required">*</span></label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nhập tên" autoFocus />
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <input type="text" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Bỏ trống nếu không muốn đổi" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Vai trò</label>
                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                      <option value="user">Người dùng (USER)</option>
                      <option value="admin">Quản trị viên (ADMIN)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="active">Đã duyệt (Active)</option>
                      <option value="pending">Chờ duyệt (Pending)</option>
                      <option value="rejected">Bị khoá (Rejected)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer" style={{ marginTop: 24, padding: 0 }}>
                  <button type="button" className="btn-outline" onClick={() => setShowEditModal(false)}>Hủy</button>
                  <button type="submit" className="btn-primary" disabled={editing}>
                    {editing ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && viewUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chi tiết người dùng</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <XMarkIcon className="icon" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-input, #f8fafc)', padding: 16, borderRadius: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                    {viewUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{viewUser.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{viewUser.email}</div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: 14 }}>
                  <div style={{ color: 'var(--text-secondary)' }}>Vai trò:</div>
                  <div style={{ fontWeight: 500 }}>{viewUser.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</div>
                  
                  <div style={{ color: 'var(--text-secondary)' }}>Trạng thái:</div>
                  <div style={{ fontWeight: 500 }}>
                    {viewUser.status === 'active' ? <span style={{color: '#10b981'}}>Đã duyệt</span> : 
                     viewUser.status === 'pending' ? <span style={{color: '#f59e0b'}}>Chờ duyệt</span> : 
                     <span style={{color: '#ef4444'}}>Bị khoá</span>}
                  </div>
                  
                  <div style={{ color: 'var(--text-secondary)' }}>Đăng ký lúc:</div>
                  <div style={{ fontWeight: 500 }}>{new Date(viewUser.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
