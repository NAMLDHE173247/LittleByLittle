import React, { useState } from 'react'
import {
  PlusIcon,
  RectangleStackIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  SwatchIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/AuthContext'
import './DecksPage.css'

const BASE_URL = ''
const DECK_API_URL = `${BASE_URL}/api/decks`

interface DecksPageProps {
  decks: any[]
  fetchDecks: () => Promise<void>
  fetchVocabularies: () => Promise<void>
  fetchMetadata: () => Promise<void>
}

export default function DecksPage({ decks, fetchDecks, fetchVocabularies, fetchMetadata }: DecksPageProps) {
  const { authHeaders } = useAuth()
  
  const [showDeckModal, setShowDeckModal] = useState(false)
  const [editingDeck, setEditingDeck] = useState<any | null>(null)
  const [deckForm, setDeckForm] = useState({ name: '', description: '', color: '#3B82F6' })
  const [deckFormError, setDeckFormError] = useState('')
  const [savingDeck, setSavingDeck] = useState(false)
  
  const [deleteDeckTarget, setDeleteDeckTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openDeckModal = (deck?: any) => {
    if (deck) {
      setEditingDeck(deck)
      setDeckForm({ name: deck.name, description: deck.description, color: deck.color })
    } else {
      setEditingDeck(null)
      setDeckForm({ name: '', description: '', color: '#3B82F6' })
    }
    setDeckFormError('')
    setShowDeckModal(true)
  }

  const closeDeckModal = () => {
    setShowDeckModal(false)
    setEditingDeck(null)
    setDeckForm({ name: '', description: '', color: '#3B82F6' })
    setDeckFormError('')
  }

  const handleSaveDeck = async () => {
    if (!deckForm.name.trim()) {
      setDeckFormError('Deck name is required')
      return
    }
    setSavingDeck(true)
    setDeckFormError('')
    try {
      const url = editingDeck ? `${DECK_API_URL}/${editingDeck._id}` : DECK_API_URL
      const method = editingDeck ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(deckForm),
      })
      const json = await res.json()
      if (json.success) {
        await fetchDecks()
        closeDeckModal()
      } else {
        setDeckFormError(json.message || 'Failed to save')
      }
    } catch {
      setDeckFormError('Network error')
    } finally {
      setSavingDeck(false)
    }
  }

  const handleDeleteDeck = async () => {
    if (!deleteDeckTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${DECK_API_URL}/${deleteDeckTarget._id}`, { method: 'DELETE', headers: authHeaders() })
      const json = await res.json()
      if (json.success) {
        await fetchDecks()
        await fetchVocabularies()
        await fetchMetadata()
        setDeleteDeckTarget(null)
      }
    } catch { /* silent */ }
    finally { setDeleting(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bộ thẻ</h1>
          <p className="page-subtitle">Sắp xếp từ vựng theo bộ thẻ học tập</p>
        </div>
        <button className="btn-primary" onClick={() => openDeckModal()}>
          <PlusIcon className="icon icon-inline" /> Tạo bộ thẻ
        </button>
      </div>

      <div className="deck-grid">
        {decks.length === 0 ? (
          <div className="deck-empty">
            <RectangleStackIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
            <p>Chưa có bộ thẻ nào. Tạo bộ thẻ đầu tiên để sắp xếp từ vựng!</p>
          </div>
        ) : (
          decks.map(deck => (
            <div key={deck._id} className="deck-card" style={{ borderTopColor: deck.color }}>
              <div className="deck-card-header">
                <div className="deck-card-color" style={{ backgroundColor: deck.color }} />
                <h3 className="deck-card-name">{deck.name}</h3>
              </div>
              {deck.description && (
                <p className="deck-card-desc">{deck.description}</p>
              )}
              <div className="deck-card-stats">
                <span className="deck-card-count">{deck.wordCount} từ</span>
              </div>
              <div className="deck-card-actions">
                <button className="btn-outline btn-sm" onClick={() => openDeckModal(deck)}>
                  <PencilSquareIcon className="icon icon-inline" /> Sửa
                </button>
                <button className="btn-danger-sm" onClick={() => setDeleteDeckTarget(deck)}>
                  <TrashIcon className="icon icon-inline" /> Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showDeckModal && (
        <div className="modal-overlay" onClick={closeDeckModal}>
          <div className="modal modal-deck" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDeck ? <><PencilSquareIcon className="icon icon-inline" /> Sửa bộ thẻ</> : <><PlusIcon className="icon icon-inline" /> Tạo bộ thẻ mới</>}</h2>
              <button className="modal-close" onClick={closeDeckModal}><XMarkIcon className="icon" /></button>
            </div>

            {deckFormError && (
              <div className="form-error">
                <ExclamationTriangleIcon className="icon icon-inline" /> {deckFormError}
              </div>
            )}

            <div className="modal-body">
              <div className="form-group full">
                <label>Tên bộ thẻ <span className="required">*</span></label>
                <input
                  type="text"
                  value={deckForm.name}
                  onChange={e => setDeckForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. IELTS Vocabulary, Business English"
                />
              </div>

              <div className="form-group full">
                <label>Mô tả</label>
                <textarea
                  value={deckForm.description}
                  onChange={e => setDeckForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Bộ thẻ này về chủ đề gì?"
                  rows={2}
                />
              </div>

              <div className="form-group full">
                <label><SwatchIcon className="icon icon-inline" /> Màu sắc</label>
                <div className="color-picker-row">
                  {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'].map(c => (
                    <button
                      key={c}
                      className={`color-swatch ${deckForm.color === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setDeckForm(prev => ({ ...prev, color: c }))}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={closeDeckModal}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveDeck} disabled={savingDeck}>
                {savingDeck ? 'Đang lưu...' : editingDeck ? 'Cập nhật' : 'Tạo bộ thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDeckTarget && (
        <div className="modal-overlay" onClick={() => setDeleteDeckTarget(null)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ExclamationTriangleIcon className="icon icon-inline" /> Xóa bộ thẻ</h2>
              <button className="modal-close" onClick={() => setDeleteDeckTarget(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc muốn xóa bộ thẻ <strong>"{deleteDeckTarget.name}"</strong>?
              </p>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Các từ vựng trong bộ thẻ sẽ không bị xóa, chỉ nhóm bộ thẻ bị gỡ bỏ.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteDeckTarget(null)}>Hủy</button>
              <button className="btn-danger" onClick={handleDeleteDeck} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa bộ thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
