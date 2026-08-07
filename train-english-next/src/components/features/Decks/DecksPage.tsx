import React, { useState } from 'react'
import {
  PlusIcon,
  RectangleStackIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  SwatchIcon,
  EyeIcon,
  BookOpenIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/AuthContext'
import { useVocabularyExport, type ExportContent } from '@/hooks/useVocabularyExport'
import './DecksPage.css'

const BASE_URL = ''
const DECK_API_URL = `${BASE_URL}/api/decks`

// Preset gradient combos for card covers
const COVER_GRADIENTS: Record<string, string> = {
  '#3B82F6': 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
  '#10B981': 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  '#8B5CF6': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  '#F59E0B': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  '#EF4444': 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
  '#EC4899': 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  '#06B6D4': 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
  '#84CC16': 'linear-gradient(135deg, #84CC16 0%, #4D7C0F 100%)',
  '#F97316': 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
  '#6366F1': 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
}

function getCoverGradient(color: string): string {
  return COVER_GRADIENTS[color] || `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`
}

interface DecksPageProps {
  decks: any[]
  metadata?: any
  fetchDecks: () => Promise<void>
  fetchVocabularies: () => Promise<void>
  fetchMetadata: () => Promise<void>
  onDeckClick?: (deckId: string) => void
}

export default function DecksPage({ decks, metadata, fetchDecks, fetchVocabularies, fetchMetadata, onDeckClick }: DecksPageProps) {
  const { authHeaders } = useAuth()

  const [showDeckModal, setShowDeckModal] = useState(false)
  const [editingDeck, setEditingDeck] = useState<any | null>(null)
  const [deckForm, setDeckForm] = useState({ name: '', description: '', color: '#3B82F6' })
  const [deckFormError, setDeckFormError] = useState('')
  const [savingDeck, setSavingDeck] = useState(false)

  const [deleteDeckTarget, setDeleteDeckTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [exportDeck, setExportDeck] = useState<any | null>(null)
  const [exportContent, setExportContent] = useState<ExportContent>('full')
  const [copiedWords, setCopiedWords] = useState(false)
  const {
    exportVocabularies,
    copyVocabularyWords,
    exporting,
    copyingWords,
    error: exportError,
    setError: setExportError,
  } = useVocabularyExport()
  const exportBusy = exporting || copyingWords

  const handleExport = async (format: 'json' | 'txt' | 'csv') => {
    if (!exportDeck) return;
    await exportVocabularies({
      format,
      content: exportContent,
      query: { deck: exportDeck._id },
      filenameBase: exportDeck.name,
    });
    // Do not close modal automatically here to ensure exporting state is visible
  }

  const handleCopyWords = async () => {
    if (!exportDeck) return
    setCopiedWords(false)
    const copied = await copyVocabularyWords({ deck: exportDeck._id })
    setCopiedWords(copied)
  }

  const closeExportModal = () => {
    if (exportBusy) return;
    setExportDeck(null);
    setExportContent('full');
    setCopiedWords(false);
    setExportError('');
  }

  const openExportModal = (deck: any) => {
    setExportContent('full');
    setCopiedWords(false);
    setExportError('');
    setExportDeck(deck);
  }

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

  const systemDeck = {
    _id: "all",
    name: "Tất cả từ vựng",
    description: "Toàn bộ từ vựng và cụm từ trong kho của bạn",
    color: "#8B5CF6",
    wordCount: metadata?.total || 0,
    isSystem: true,
  };

  const displayDecks = [systemDeck, ...decks];

  return (
    <div className="decks-container">
      {/* ===== Facebook-style Page Header ===== */}
      <div className="decks-page-header">
        <div className="decks-header-info">
          <h1 className="decks-header-title">Bộ thẻ</h1>
          <p className="decks-header-subtitle">Sắp xếp từ vựng theo bộ thẻ học tập</p>
        </div>
        <button className="btn-create-deck" onClick={() => openDeckModal()}>
          <PlusIcon className="icon icon-inline" /> Tạo bộ thẻ
        </button>
      </div>

      {/* ===== Feed ===== */}
      <div className="deck-feed">
        {decks.length === 0 && (
          <div className="deck-empty" style={{ gridColumn: '1 / -1', marginBottom: '16px', padding: '24px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Bạn chưa có bộ thẻ tùy chỉnh nào. Hãy tạo bộ thẻ để tổ chức từ vựng nhé!</p>
          </div>
        )}
        {displayDecks.map(deck => {
            const wordCount = deck.wordCount || 0
            return (
              <div
                key={deck._id}
                className="fb-deck-card"
                onClick={() => onDeckClick && onDeckClick(deck._id)}
              >
                {/* Cover Banner */}
                <div className="fb-card-cover">
                  <div
                    className="fb-card-cover-gradient"
                    style={{ background: getCoverGradient(deck.color) }}
                  />
                  {/* Avatar */}
                  <div className="fb-card-avatar" style={{ borderColor: 'var(--bg-card)' }}>
                    <RectangleStackIcon className="fb-card-avatar-icon" style={{ color: deck.color }} />
                  </div>
                </div>

                {/* Card Body */}
                <div className="fb-card-body">
                  <h3 className="fb-card-title">{deck.name}</h3>
                  {deck.description && (
                    <p className="fb-card-desc">{deck.description}</p>
                  )}

                  <div className="fb-card-meta">
                    <span className="fb-card-badge">
                      <BookOpenIcon className="badge-icon" />
                      {wordCount} từ
                    </span>
                    {deck.updatedAt && (
                      <span className="fb-card-date">
                        <ClockIcon className="date-icon" />
                        {new Date(deck.updatedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar (visual flair) */}
                {wordCount > 0 && !deck.isSystem && (
                  <div className="fb-card-progress-wrap">
                    <div className="fb-card-progress-bar">
                      <div
                        className="fb-card-progress-fill"
                        style={{
                          width: `${Math.min(100, wordCount)}%`,
                          background: getCoverGradient(deck.color),
                        }}
                      />
                    </div>
                    <div className="fb-card-progress-label">
                      <span>Tiến độ</span>
                      <span>{Math.min(100, wordCount)} từ</span>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <hr className="fb-card-divider" />

                {/* Action Bar */}
                <div className="fb-card-actions">
                  <button
                    className="fb-action-btn view"
                    onClick={(e) => { e.stopPropagation(); onDeckClick && onDeckClick(deck._id) }}
                    title="Xem bộ thẻ"
                  >
                    <EyeIcon className="action-icon" />
                    <span>Xem</span>
                  </button>
                  {!deck.isSystem && (
                    <>
                      <button
                        className="fb-action-btn edit"
                        onClick={(e) => { e.stopPropagation(); openDeckModal(deck) }}
                        title="Sửa bộ thẻ"
                      >
                        <PencilSquareIcon className="action-icon" />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        className="fb-action-btn export"
                        onClick={(e) => { e.stopPropagation(); openExportModal(deck) }}
                        title="Xuất bộ thẻ"
                      >
                        <ArrowUpTrayIcon className="action-icon" />
                        <span>Xuất</span>
                      </button>
                      <button
                        className="fb-action-btn delete"
                        onClick={(e) => { e.stopPropagation(); setDeleteDeckTarget(deck) }}
                        title="Xóa bộ thẻ"
                      >
                        <TrashIcon className="action-icon" />
                        <span>Xóa</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* ===== Create/Edit Modal ===== */}
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

      {/* ===== Delete Confirm Modal ===== */}
      {deleteDeckTarget && (
        <div className="modal-overlay" onClick={() => setDeleteDeckTarget(null)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ExclamationTriangleIcon className="icon icon-inline" /> Xóa bộ thẻ</h2>
              <button className="modal-close" onClick={() => setDeleteDeckTarget(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc muốn xóa bộ thẻ <strong>&quot;{deleteDeckTarget.name}&quot;</strong>?
              </p>
              <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                Các từ vựng trong bộ thẻ sẽ không bị xóa, chỉ nhóm bộ thẻ bị gỡ bỏ.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteDeckTarget(null)} disabled={deleting}>Hủy</button>
              <button className="btn-danger" onClick={handleDeleteDeck} disabled={deleting}>
                {deleting ? 'Đang xóa...' : 'Xóa bộ thẻ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Export Modal ===== */}
      {exportDeck && (
        <div className="modal-overlay" onClick={closeExportModal}>
          <div className="modal modal-deck" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2><ArrowUpTrayIcon className="icon icon-inline" /> Xuất bộ thẻ</h2>
              <button className="modal-close" onClick={closeExportModal} disabled={exportBusy}>
                <XMarkIcon className="icon" />
              </button>
            </div>

            <div className="modal-body" style={{ paddingBottom: '20px' }}>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Chọn định dạng để xuất bộ thẻ <strong>&quot;{exportDeck.name}&quot;</strong>:
              </p>

              {exportError && (
                <div className="form-error" style={{ marginBottom: '16px' }}>
                  <ExclamationTriangleIcon className="icon icon-inline" /> {exportError}
                </div>
              )}

              {exportDeck.wordCount !== 0 && (
                <fieldset className="deck-export-content-fieldset" disabled={exportBusy}>
                  <legend>Nội dung xuất</legend>
                  <div className="deck-export-content-options">
                    {([
                      { value: 'full', label: 'Đầy đủ', description: 'Toàn bộ thông tin từ vựng' },
                      { value: 'word', label: 'Chỉ từ', description: 'Danh sách từ, mỗi từ một dòng' },
                      { value: 'word-meaning', label: 'Từ và nghĩa', description: 'Từ kèm các nghĩa tương ứng' },
                    ] as const).map(option => (
                      <label
                        key={option.value}
                        className={`deck-export-content-option ${exportContent === option.value ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="deck-export-content"
                          value={option.value}
                          checked={exportContent === option.value}
                          onChange={() => setExportContent(option.value)}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {exportDeck.wordCount !== 0 && (
                <button
                  className={`btn-outline deck-export-copy-btn ${copiedWords ? 'copied' : ''}`}
                  onClick={handleCopyWords}
                  disabled={exportBusy}
                  type="button"
                >
                  <ClipboardDocumentIcon className="icon icon-inline" />
                  <span>
                    <strong>{copiedWords ? 'Đã sao chép' : 'Sao chép nhanh chỉ từ'}</strong>
                    <small>Mỗi từ một dòng, sẵn sàng để dán</small>
                  </span>
                </button>
              )}

              {exportDeck.wordCount === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0', border: 'none' }}>
                  Bộ thẻ này chưa có từ vựng nào.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleExport('json')} 
                    disabled={exportBusy}
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', height: 'auto', textAlign: 'left' }}
                  >
                    <CodeBracketIcon className="icon icon-inline" style={{ flexShrink: 0, marginRight: '12px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Xuất JSON</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dữ liệu có cấu trúc, phù hợp lưu trữ và import</div>
                    </div>
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleExport('txt')} 
                    disabled={exportBusy}
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', height: 'auto', textAlign: 'left' }}
                  >
                    <DocumentTextIcon className="icon icon-inline" style={{ flexShrink: 0, marginRight: '12px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Xuất TXT</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dạng văn bản dễ đọc và sao chép</div>
                    </div>
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleExport('csv')} 
                    disabled={exportBusy}
                    style={{ justifyContent: 'flex-start', padding: '12px 16px', height: 'auto', textAlign: 'left' }}
                  >
                    <DocumentTextIcon className="icon icon-inline" style={{ flexShrink: 0, marginRight: '12px' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>Xuất CSV</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dễ dùng với Excel, Quizlet và Anki</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="modal-actions" style={{ justifyContent: 'flex-end', width: '100%' }}>
                {exportBusy && <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>{copyingWords ? 'Đang sao chép...' : 'Đang xuất...'}</span>}
                <button className="btn-outline" onClick={closeExportModal} disabled={exportBusy}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
