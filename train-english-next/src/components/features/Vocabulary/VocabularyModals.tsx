import React, { useState } from 'react'
import {
  ArrowDownTrayIcon, PlusIcon, XMarkIcon, CheckIcon, ClipboardDocumentIcon,
  ExclamationTriangleIcon, PencilSquareIcon, RectangleStackIcon, LightBulbIcon,
  TrashIcon, BookOpenIcon, SpeakerWaveIcon, LanguageIcon, ArrowsRightLeftIcon,
  ArrowPathIcon, BookmarkIcon, PhotoIcon
} from '@heroicons/react/24/outline'
import './VocabularyPage.css'

export interface VocabularyModalsProps {
  modalsState: any;
  modalsActions: any;
}

export default function VocabularyModals({ modalsState, modalsActions }: VocabularyModalsProps) {
  const {
    showImportModal, importJsonText, importError, isImporting, importResult, importCopied,
    showModal, editingId, formError, formData, saving,
    deleteTarget, deleting,
    quickDeckVocab, quickDeckIds, savingQuickDeck,
    detailVocab, copied, decks
  } = modalsState;

  const {
    setShowImportModal, setImportJsonText, setImportError, setImportResult, setImportCopied, handleImport,
    closeModal, setFormData, handleSave, addExample, updateExample, removeExample,
    setDeleteTarget, handleDelete, handleDeleteSelected, handleClearAll,
    setQuickDeckVocab, setQuickDeckIds, handleSaveQuickDeck,
    setDetailVocab, speak, setCopied, getLevelColor, openEditModal,
    authHeaders, fetchVocabularies
  } = modalsActions;

  // State for inline image editing in detail view
  const [detailImageUrl, setDetailImageUrl] = useState<string>('');
  const [isEditingDetailImage, setIsEditingDetailImage] = useState(false);
  const [savingDetailImage, setSavingDetailImage] = useState(false);

  // Import mode: 'basic' (không ảnh) | 'full' (kèm imageUrl)
  const [importMode, setImportMode] = useState<'basic' | 'full'>('basic');

  const IMPORT_PROMPT_BASIC = `Từ nội dung dưới đây, hãy trích xuất tất cả các từ vựng tiếng Anh quan trọng và trả về theo định dạng JSON array chuẩn. Chủ đề là "[CHỦ ĐỀ]", trình độ là "[B1/B2/...]". Bạn chỉ trả về mảng JSON, không giải thích gì thêm:\n\n[NỘI DUNG CỦA BẠN Ở ĐÀY]\n\nĐịnh dạng JSON mỗi từ:\n[\n  {\n    "word": "từ vựng",\n    "type": "word",\n    "pronunciation": "/phiên âm IPA/",\n    "meanings": ["nghĩa tiếng Việt 1", "nghĩa tiếng Việt 2"],\n    "partOfSpeech": "noun/verb/adjective/adverb",\n    "examples": [{ "en": "câu ví dụ tiếng Anh", "vi": "dịch nghĩa tiếng Việt" }],\n    "topic": "[CHỦ ĐỀ]",\n    "level": "B1",\n    "synonyms": ["từ đồng nghĩa"],\n    "antonyms": ["từ trái nghĩa"],\n    "note": "ghi chú hoặc mẹo nhớ"\n  }\n]`;

  const IMPORT_PROMPT_FULL = `Từ nội dung dưới đây, hãy trích xuất tất cả các từ vựng tiếng Anh quan trọng và trả về theo định dạng JSON array chuẩn. Chủ đề là "[CHỦ ĐỀ]", trình độ là "[B1/B2/...]". Với mỗi từ, hãy thêm trường "imageUrl" là một đường dẫn ảnh minh họa hợp lệ (URL công khai trực tiếp tới file ảnh .jpg/.png). Bạn chỉ trả về mảng JSON, không giải thích gì thêm:\n\n[NỘI DUNG CỦA BẠN Ở ĐÀY]\n\nĐịnh dạng JSON mỗi từ:\n[\n  {\n    "word": "từ vựng",\n    "type": "word",\n    "pronunciation": "/phiên âm IPA/",\n    "meanings": ["nghĩa tiếng Việt 1", "nghĩa tiếng Việt 2"],\n    "partOfSpeech": "noun/verb/adjective/adverb",\n    "examples": [{ "en": "câu ví dụ tiếng Anh", "vi": "dịch nghĩa tiếng Việt" }],\n    "topic": "[CHỦ ĐỀ]",\n    "level": "B1",\n    "synonyms": ["từ đồng nghĩa"],\n    "antonyms": ["từ trái nghĩa"],\n    "note": "ghi chú hoặc mẹo nhớ",\n    "imageUrl": "https://.../anh-minh-hoa.jpg"\n  }\n]`;

  const activePrompt = importMode === 'full' ? IMPORT_PROMPT_FULL : IMPORT_PROMPT_BASIC;

  const basicPlaceholder = `[\n  {\n    "word": "example",\n    "meanings": ["ví dụ"],\n    ...\n  }\n]`;
  const fullPlaceholder = `[\n  {\n    "word": "example",\n    "meanings": ["ví dụ"],\n    "imageUrl": "https://.../anh.jpg",\n    ...\n  }\n]`;

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportMode('basic');
  };

  return (
    <>
      {/* ===== IMPORT MODAL ===== */}
      {showImportModal && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal import-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ArrowDownTrayIcon className="icon icon-inline" /> Import từ vựng qua AI</h2>
              <button className="modal-close" onClick={closeImportModal}><XMarkIcon className="icon" /></button>
            </div>

            <div className="import-mode-bar">
              <div className="import-tabs">
                <button
                  type="button"
                  className={`import-tab ${importMode === 'basic' ? 'active' : ''}`}
                  onClick={() => setImportMode('basic')}
                >
                  Import cơ bản
                  <span className="import-tab-tooltip">
                    Chỉ import thông tin chữ (nghĩa, phát âm, ví dụ, ghi chú...). Phù hợp khi dán nhanh kết quả từ AI mà không cần ảnh.
                  </span>
                </button>
                <button
                  type="button"
                  className={`import-tab ${importMode === 'full' ? 'active' : ''}`}
                  onClick={() => setImportMode('full')}
                >
                  Import đầy đủ (kèm ảnh)
                  <span className="import-tab-tooltip">
                    Import từ vựng kèm đường dẫn ảnh minh họa (imageUrl). Phù hợp khi muốn mỗi từ có hình ảnh trực quan.
                  </span>
                </button>
              </div>
              <div className="import-mode-hint">
                {importMode === 'full'
                  ? 'Chế độ đầy đủ: mỗi từ sẽ có thêm trường "imageUrl" chứa link ảnh minh họa.'
                  : 'Chế độ cơ bản: import nhanh, không bao gồm ảnh minh họa. Hover tab để xem hướng dẫn.'}
              </div>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="import-step">
                <div className="import-step-header">
                  <span className="import-step-number">1</span>
                  <span className="import-step-title">Copy câu lệnh mẫu gửi cho AI (ChatGPT / Claude / Gemini)</span>
                </div>
                <div className="import-prompt-box">
                  <pre className="import-prompt-text">{activePrompt}</pre>
                  <button
                    className={`btn-copy-prompt ${importCopied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(activePrompt)
                      setImportCopied(true)
                      setTimeout(() => setImportCopied(false), 2500)
                    }}
                  >
                    {importCopied
                      ? <><CheckIcon className="icon icon-inline" /> Đã copy!</>
                      : <><ClipboardDocumentIcon className="icon icon-inline" /> Copy Prompt</>
                    }
                  </button>
                </div>
              </div>

              {/* Step 2: Paste JSON */}
              <div className="import-step">
                <div className="import-step-header">
                  <span className="import-step-number">2</span>
                  <span className="import-step-title">Dán (paste) dữ liệu JSON mà AI trả về vào đây</span>
                </div>
                <textarea
                  className="import-textarea"
                  placeholder={importMode === 'full' ? fullPlaceholder : basicPlaceholder}
                  value={importJsonText}
                  onChange={e => { setImportJsonText(e.target.value); setImportError(''); setImportResult(null) }}
                  rows={10}
                />
                {importError && (
                  <div className="import-error">
                    <ExclamationTriangleIcon className="icon icon-inline" /> {importError}
                  </div>
                )}
              </div>

              {/* Result */}
              {importResult && (
                 <div className="import-result">
                  <div className="import-result-header">
                    <CheckIcon className="icon icon-inline" /> Kết quả Import
                  </div>
                  <div className="import-result-stats">
                    <div className="import-stat success">
                      <span className="import-stat-value">{importResult.inserted}</span>
                      <span className="import-stat-label">Đã thêm</span>
                    </div>
                    <div className="import-stat warning">
                      <span className="import-stat-value">{importResult.skipped}</span>
                      <span className="import-stat-label">Bỏ qua (trùng)</span>
                    </div>
                    <div className="import-stat error">
                      <span className="import-stat-value">{importResult.errors.length}</span>
                      <span className="import-stat-label">Lỗi</span>
                    </div>
                  </div>
                  {importResult.skippedWords.length > 0 && (
                    <div className="import-result-detail">
                      <span className="import-detail-label">Từ bị trùng:</span>
                      <span className="import-detail-words">{importResult.skippedWords.join(', ')}</span>
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="import-result-detail errors">
                      <span className="import-detail-label">Chi tiết lỗi:</span>
                      {importResult.errors.map((err: string, i: number) => (
                        <span key={i} className="import-error-item">{err}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={closeImportModal}>Đóng</button>
              <button className="btn-primary" onClick={handleImport} disabled={isImporting || !importJsonText.trim()}>
                {isImporting ? <><span className="spinner-sm"></span> Đang import...</> : <><ArrowDownTrayIcon className="icon icon-inline" /> Import Dữ Liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? <><PencilSquareIcon className="icon icon-inline" /> Sửa từ vựng</> : <><PlusIcon className="icon icon-inline" /> Thêm từ vựng mới</>}</h2>
              <button className="modal-close" onClick={closeModal}><XMarkIcon className="icon" /></button>
            </div>

            <div className="modal-body">
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-grid">
                <div className="form-group full">
                  <label>Từ / Cụm từ <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.word}
                    onChange={e => setFormData((prev: any) => ({ ...prev, word: e.target.value }))}
                    placeholder="e.g. accomplish, break the ice"
                  />
                </div>

                <div className="form-group">
                  <label>Loại</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData((prev: any) => ({ ...prev, type: e.target.value as 'word' | 'phrase' }))}
                  >
                    <option value="word">Từ</option>
                    <option value="phrase">Cụm từ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cấp độ</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData((prev: any) => ({ ...prev, level: e.target.value }))}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Phát âm</label>
                  <input
                    type="text"
                    value={formData.pronunciation}
                    onChange={e => setFormData((prev: any) => ({ ...prev, pronunciation: e.target.value }))}
                    placeholder="e.g. /əˈkɒm.plɪʃ/"
                  />
                </div>

                <div className="form-group">
                  <label>Từ loại</label>
                  <select
                    value={formData.partOfSpeech}
                    onChange={e => setFormData((prev: any) => ({ ...prev, partOfSpeech: e.target.value }))}
                  >
                    <option value="">Chọn...</option>
                    <option value="noun">Danh từ</option>
                    <option value="verb">Động từ</option>
                    <option value="adjective">Tính từ</option>
                    <option value="adverb">Trạng từ</option>
                    <option value="preposition">Giới từ</option>
                    <option value="phrasal verb">Cụm động từ</option>
                    <option value="idiom">Thành ngữ</option>
                    <option value="conjunction">Liên từ</option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>Nghĩa (Tiếng Việt) <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.meanings}
                    onChange={e => setFormData((prev: any) => ({ ...prev, meanings: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy: hoàn thành, đạt được"
                  />
                </div>

                <div className="form-group">
                  <label>Chủ đề</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={e => setFormData((prev: any) => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. daily life, business"
                  />
                </div>

                <div className="form-group">
                  <label>Từ đồng nghĩa</label>
                  <input
                    type="text"
                    value={formData.synonyms}
                    onChange={e => setFormData((prev: any) => ({ ...prev, synonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group">
                  <label>Từ trái nghĩa</label>
                  <input
                    type="text"
                    value={formData.antonyms}
                    onChange={e => setFormData((prev: any) => ({ ...prev, antonyms: e.target.value }))}
                    placeholder="Cách nhau bằng dấu phẩy"
                  />
                </div>

                <div className="form-group full">
                  <label>Ghi chú</label>
                  <textarea
                    value={formData.note}
                    onChange={e => setFormData((prev: any) => ({ ...prev, note: e.target.value }))}
                    placeholder="Mẹo, ngữ cảnh sử dụng..."
                    rows={2}
                  />
                </div>

                <div className="form-group full">
                  <label>Đường dẫn ảnh</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={e => setFormData((prev: any) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                  />
                  {formData.imageUrl && (
                    <div className="image-preview">
                      <img src={formData.imageUrl} alt="Preview" onError={e => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>

                {/* Deck Assignment */}
                {decks.length > 0 && (
                  <div className="form-group full">
                    <label><RectangleStackIcon className="icon icon-inline" /> Gán vào bộ thẻ</label>
                    <div className="deck-checkbox-list">
                      {decks.map((deck: any) => (
                        <label key={deck._id} className="deck-checkbox-item">
                          <input
                            type="checkbox"
                            checked={formData.deckIds.includes(deck._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev: any) => ({ ...prev, deckIds: [...prev.deckIds, deck._id] }))
                              } else {
                                setFormData((prev: any) => ({ ...prev, deckIds: prev.deckIds.filter((id: string) => id !== deck._id) }))
                              }
                            }}
                          />
                          <span className="deck-checkbox-color" style={{ backgroundColor: deck.color }} />
                          <span>{deck.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Examples */}
              <div className="form-examples">
                <div className="examples-header">
                  <label><LightBulbIcon className="icon icon-inline" /> Ví dụ</label>
                  <button className="btn-outline btn-sm" onClick={addExample}>+ Thêm ví dụ</button>
                </div>
                {formData.examples.map((ex: any, idx: number) => (
                  <div key={idx} className="example-row">
                    <div className="example-inputs">
                      <input
                        type="text"
                        value={ex.en}
                        onChange={e => updateExample(idx, 'en', e.target.value)}
                        placeholder="Câu tiếng Anh..."
                      />
                      <input
                        type="text"
                        value={ex.vi}
                        onChange={e => updateExample(idx, 'vi', e.target.value)}
                        placeholder="Bản dịch tiếng Việt..."
                      />
                    </div>
                    {formData.examples.length > 1 && (
                      <button className="btn-remove-ex" onClick={() => removeExample(idx)}><XMarkIcon className="icon" /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={closeModal}>Hủy</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION ===== */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><TrashIcon className="icon icon-inline" /> Xác nhận xóa</h2>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              {deleteTarget.id === '__clear_all__' ? (
                <p className="delete-msg">
                  Bạn có chắc muốn xóa{' '}
                  <strong>TOÀN BỘ từ vựng</strong> trong cơ sở dữ liệu?
                  Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn và <strong>không thể hoàn tác</strong>.
                </p>
              ) : (
                <p className="delete-msg">
                  Bạn có chắc muốn xóa{' '}
                  <strong>{deleteTarget.word}</strong>?
                  Hành động này không thể hoàn tác.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setDeleteTarget(null)}>Hủy</button>
              <button
                className="btn-danger"
                onClick={
                  deleteTarget.id === '__clear_all__'
                    ? handleClearAll
                    : deleteTarget.id === '__bulk__'
                      ? handleDeleteSelected
                      : handleDelete
                }
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : deleteTarget.id === '__clear_all__' ? 'Xóa toàn bộ' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== QUICK DECK EDIT MODAL ===== */}
      {quickDeckVocab && (
        <div className="modal-overlay" onClick={() => setQuickDeckVocab(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><RectangleStackIcon className="icon icon-inline" /> Chọn bộ thẻ cho từ</h2>
              <button className="modal-close" onClick={() => setQuickDeckVocab(null)}><XMarkIcon className="icon" /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                Từ vựng: <strong>{quickDeckVocab.word}</strong>
              </p>
              {decks.length === 0 ? (
                <p className="text-muted">Chưa có bộ thẻ nào được tạo.</p>
              ) : (
                <div className="deck-checkbox-list">
                  {decks.map((deck: any) => (
                    <label key={deck._id} className="deck-checkbox-item">
                      <input
                        type="checkbox"
                        checked={quickDeckIds.includes(deck._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuickDeckIds((prev: any) => [...prev, deck._id])
                          } else {
                            setQuickDeckIds((prev: any) => prev.filter((id: string) => id !== deck._id))
                          }
                        }}
                      />
                      <span className="deck-checkbox-color" style={{ backgroundColor: deck.color }} />
                      <span>{deck.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setQuickDeckVocab(null)}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveQuickDeck} disabled={savingQuickDeck}>
                {savingQuickDeck ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL POPUP ===== */}
      {detailVocab && (
        <div className="modal-overlay" onClick={() => setDetailVocab(null)}>
          <div className="modal modal-detail" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BookOpenIcon className="icon icon-inline" /> Chi tiết từ vựng</h2>
              <button className="modal-close" onClick={() => setDetailVocab(null)}><XMarkIcon className="icon" /></button>
            </div>

            <div className="modal-body">
              {/* Image */}
              {detailVocab.imageUrl ? (
                <div className="detail-image">
                  <img
                    src={detailVocab.imageUrl}
                    alt={detailVocab.word}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              ) : (
                <div className="detail-image-add">
                  {isEditingDetailImage ? (
                    <div className="detail-image-edit-form">
                      <input
                        type="text"
                        className="detail-image-input"
                        placeholder="Dán URL ảnh vào đây..."
                        value={detailImageUrl}
                        onChange={e => setDetailImageUrl(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && detailImageUrl.trim()) {
                            e.preventDefault()
                            setSavingDetailImage(true)
                            try {
                              const res = await fetch(`/api/vocabulary/${detailVocab._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                body: JSON.stringify({ imageUrl: detailImageUrl.trim() })
                              })
                              const result = await res.json()
                              if (result.success) {
                                setDetailVocab({ ...detailVocab, imageUrl: detailImageUrl.trim() })
                                if (fetchVocabularies) fetchVocabularies()
                              }
                            } catch (err) { console.error(err) }
                            setSavingDetailImage(false)
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          } else if (e.key === 'Escape') {
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          }
                        }}
                        autoFocus
                      />
                      {detailImageUrl && (
                        <img
                          className="detail-image-preview"
                          src={detailImageUrl}
                          alt="Preview"
                          onError={e => (e.currentTarget.style.display = 'none')}
                          onLoad={e => (e.currentTarget.style.display = 'block')}
                        />
                      )}
                      <div className="detail-image-actions">
                        <button
                          className="btn-primary btn-sm"
                          disabled={!detailImageUrl.trim() || savingDetailImage}
                          onClick={async () => {
                            if (!detailImageUrl.trim()) return
                            setSavingDetailImage(true)
                            try {
                              const res = await fetch(`/api/vocabulary/${detailVocab._id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                body: JSON.stringify({ imageUrl: detailImageUrl.trim() })
                              })
                              const result = await res.json()
                              if (result.success) {
                                setDetailVocab({ ...detailVocab, imageUrl: detailImageUrl.trim() })
                                if (fetchVocabularies) fetchVocabularies()
                              }
                            } catch (err) { console.error(err) }
                            setSavingDetailImage(false)
                            setIsEditingDetailImage(false)
                            setDetailImageUrl('')
                          }}
                        >
                          {savingDetailImage ? 'Đang lưu...' : 'Lưu ảnh'}
                        </button>
                        <button
                          className="btn-outline btn-sm"
                          onClick={() => { setIsEditingDetailImage(false); setDetailImageUrl('') }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="detail-image-add-btn"
                      onClick={() => setIsEditingDetailImage(true)}
                    >
                      <PhotoIcon className="icon" style={{ width: 28, height: 28 }} />
                      <span>Thêm ảnh minh họa</span>
                    </button>
                  )}
                </div>
              )}

              {/* Word Header */}
              <div className="detail-word-header">
                <div className="detail-word-row">
                  <h3 className="detail-word">{detailVocab.word}</h3>
                  <button
                    className="speak-btn detail-speak"
                    onClick={() => speak(detailVocab.word)}
                    title="Nghe"
                  >
                    <SpeakerWaveIcon className="icon" />
                  </button>
                  <button
                    className={`copy-btn ${copied ? 'copied' : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(detailVocab.word)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    title="Sao chép"
                  >
                    {copied ? <CheckIcon className="icon" /> : <ClipboardDocumentIcon className="icon" />}
                  </button>
                </div>
                {detailVocab.pronunciation && (
                  <span className="detail-pron">{detailVocab.pronunciation}</span>
                )}
                <div className="detail-badges">
                  <span className={`badge badge-type-${detailVocab.type}`}>{detailVocab.type}</span>
                  {detailVocab.partOfSpeech && <span className="badge badge-pos">{detailVocab.partOfSpeech}</span>}
                  <span className="badge badge-level" style={{ backgroundColor: getLevelColor(detailVocab.level) }}>{detailVocab.level}</span>
                  {detailVocab.topic && <span className="badge badge-topic">{detailVocab.topic}</span>}
                </div>
              </div>

              {/* Meanings */}
              <div className="detail-section">
                <h4><LanguageIcon className="icon icon-inline" /> Nghĩa</h4>
                <ul className="detail-meanings-list">
                  {detailVocab.meanings.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              {detailVocab.examples.length > 0 && (
                <div className="detail-section">
                  <h4><LightBulbIcon className="icon icon-inline" /> Ví dụ</h4>
                  {detailVocab.examples.map((ex: any, i: number) => (
                    <div key={i} className="example-block">
                      <p className="ex-en"><span className="flag-label">EN</span> {ex.en}</p>
                      <p className="ex-vi"><span className="flag-label vi">VI</span> {ex.vi}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Synonyms & Antonyms */}
              {(detailVocab.synonyms.length > 0 || detailVocab.antonyms.length > 0) && (
                <div className="detail-tags-row">
                  {detailVocab.synonyms.length > 0 && (
                    <div className="detail-section">
                      <h4><ArrowsRightLeftIcon className="icon icon-inline" /> Từ đồng nghĩa</h4>
                      <div className="chip-list">
                        {detailVocab.synonyms.map((s: string, i: number) => (
                          <span key={i} className="chip chip-syn">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {detailVocab.antonyms.length > 0 && (
                    <div className="detail-section">
                      <h4><ArrowPathIcon className="icon icon-inline" /> Từ trái nghĩa</h4>
                      <div className="chip-list">
                        {detailVocab.antonyms.map((a: string, i: number) => (
                          <span key={i} className="chip chip-ant">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              {detailVocab.note && (
                <div className="detail-section">
                  <h4><BookmarkIcon className="icon icon-inline" /> Ghi chú</h4>
                  <p className="note-box">{detailVocab.note}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={() => {
                openEditModal(detailVocab)
                setDetailVocab(null)
              }}>
                <PencilSquareIcon className="icon icon-inline" /> Sửa
              </button>
              <button className="btn-danger" onClick={() => {
                setDeleteTarget({ id: detailVocab._id, word: detailVocab.word })
                setDetailVocab(null)
              }}>
                <TrashIcon className="icon icon-inline" /> Xóa
              </button>
              <button className="btn-primary" onClick={() => setDetailVocab(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
