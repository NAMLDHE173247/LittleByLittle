import React, { useState } from 'react'
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, PlusIcon, DocumentTextIcon, ChatBubbleLeftRightIcon,
  TagIcon, MagnifyingGlassIcon, TrashIcon, XMarkIcon, ExclamationTriangleIcon,
  CheckIcon, SpeakerWaveIcon, PhotoIcon, PencilSquareIcon, EyeIcon
} from '@heroicons/react/24/outline'
import { BookOpenIcon as BookOpenSolidIcon } from '@heroicons/react/24/solid'

export interface VocabularyPageProps {
  data: {
    vocabularies: any[];
    loading: boolean;
    error: string;
    metadata: any;
    decks: any[];
    totalFiltered: number;
  };
  filters: {
    searchQuery: string; setSearchQuery: any;
    filterCategory: string; setFilterCategory: any;
    filterLevel: string; setFilterLevel: any;
    filterTopic: string; setFilterTopic: any;
    filterPartOfSpeech: string; setFilterPartOfSpeech: any;
    filterDeck: string; setFilterDeck: any;
  };
  pagination: {
    currentPage: number; setCurrentPage: any;
    totalPagesState: number;
  };
  sorting: {
    sortField: string; sortDir: string; handleSort: any; getSortIcon: any;
  };
  selection: {
    selectedRows: string[]; isSelectionMode: boolean; setIsSelectionMode: any;
    toggleSelectAll: any; toggleSelectRow: any; setSelectedRows: any;
  };
  actions: {
    openAddModal: any; openEditModal: any; setDetailVocab: any; setDeleteTarget: any;
    setShowImportModal: any; setImportResult: any; setImportError: any; setImportJsonText: any;
    setQuickDeckVocab: any; setQuickDeckIds: any; speak: any; getLevelColor: any;
    authHeaders: () => Record<string, string>;
  };
}

export default function VocabularyPage({
  data, filters, pagination, sorting, selection, actions
}: VocabularyPageProps) {
  const { vocabularies, loading, error, metadata, decks, totalFiltered } = data;
  const { searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterLevel, setFilterLevel, filterTopic, setFilterTopic, filterPartOfSpeech, setFilterPartOfSpeech, filterDeck, setFilterDeck } = filters;
  const { currentPage, setCurrentPage, totalPagesState } = pagination;
  const { sortField, handleSort, getSortIcon } = sorting;
  const { selectedRows, isSelectionMode, setIsSelectionMode, toggleSelectAll, toggleSelectRow, setSelectedRows } = selection;
  const { openAddModal, openEditModal, setDetailVocab, setDeleteTarget, setShowImportModal, setImportResult, setImportError, setImportJsonText, setQuickDeckVocab, setQuickDeckIds, speak, getLevelColor, authHeaders } = actions;

  const [exporting, setExporting] = useState(false);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');

  const exportToTxt = async () => {
    setExporting(true);
    try {
      // Fetch all vocabulary without pagination
      const res = await fetch(`/api/vocabulary?limit=10000`, { headers: authHeaders() });
      const json = await res.json();
      if (!json.success || !json.data) {
        alert('Không thể tải dữ liệu từ vựng!');
        return;
      }

      const allVocabs: any[] = json.data;
      const now = new Date().toLocaleString('vi-VN');
      const separator = '═'.repeat(60);
      const thinSep = '─'.repeat(60);

      let txt = '';
      txt += `${separator}\n`;
      txt += `  📚 DANH SÁCH TỪ VỰNG - LittleByLittle\n`;
      txt += `  Xuất lúc: ${now}\n`;
      txt += `  Tổng: ${allVocabs.length} từ\n`;
      txt += `${separator}\n\n`;

      allVocabs.forEach((v: any, idx: number) => {
        txt += `${thinSep}\n`;
        txt += `  ${idx + 1}. ${v.word}`;
        if (v.pronunciation) txt += `  /${v.pronunciation}/`;
        txt += `\n`;
        txt += `${thinSep}\n`;

        if (v.meanings?.length > 0) {
          txt += `  Nghĩa:        ${v.meanings.join(', ')}\n`;
        }
        if (v.partOfSpeech) {
          txt += `  Từ loại:      ${v.partOfSpeech}\n`;
        }
        if (v.level) {
          txt += `  Cấp độ:       ${v.level}\n`;
        }
        if (v.type) {
          txt += `  Loại:         ${v.type === 'word' ? 'Từ đơn' : 'Cụm từ'}\n`;
        }
        if (v.topic) {
          txt += `  Chủ đề:       ${v.topic}\n`;
        }
        if (v.synonyms?.length > 0) {
          txt += `  Đồng nghĩa:  ${v.synonyms.join(', ')}\n`;
        }
        if (v.antonyms?.length > 0) {
          txt += `  Trái nghĩa:  ${v.antonyms.join(', ')}\n`;
        }
        if (v.examples?.length > 0) {
          txt += `  Ví dụ:\n`;
          v.examples.forEach((ex: any, i: number) => {
            txt += `    ${i + 1}) ${ex.en}\n`;
            if (ex.vi) txt += `       → ${ex.vi}\n`;
          });
        }
        if (v.note) {
          txt += `  Ghi chú:      ${v.note}\n`;
        }
        txt += `\n`;
      });

      txt += `${separator}\n`;
      txt += `  Hết danh sách (${allVocabs.length} từ)\n`;
      txt += `${separator}\n`;

      // Download file
      const blob = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tu-vung-littlebylittle-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi khi xuất dữ liệu!');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Từ vựng</h1>
          <p className="page-subtitle">Quản lý bộ sưu tập từ vựng của bạn</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline" onClick={exportToTxt} disabled={exporting}>
            <ArrowUpTrayIcon className="icon icon-inline" /> {exporting ? 'Đang xuất...' : 'Export TXT'}
          </button>
          <button className="btn-import" onClick={() => { setShowImportModal(true); setImportResult(null); setImportError(''); setImportJsonText('') }}>
            <ArrowDownTrayIcon className="icon icon-inline" /> Import từ vựng
          </button>
          <button className="btn-primary" onClick={openAddModal}>
            <PlusIcon className="icon icon-inline" /> Thêm từ mới
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue"><DocumentTextIcon className="icon" /></div>
          <div className="stat-info">
            <span className="stat-number">{metadata.total}</span>
            <span className="stat-label">Tổng số từ</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><BookOpenSolidIcon className="icon" /></div>
          <div className="stat-info">
            <span className="stat-number">{metadata.totalWords}</span>
            <span className="stat-label">Từ đơn</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><ChatBubbleLeftRightIcon className="icon" /></div>
          <div className="stat-info">
            <span className="stat-number">{metadata.totalPhrases}</span>
            <span className="stat-label">Cụm từ</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><TagIcon className="icon" /></div>
          <div className="stat-info">
            <span className="stat-number">{metadata.uniqueTopics?.length || 0}</span>
            <span className="stat-label">Chủ đề</span>
          </div>
        </div>
      </div>

      {/* FILTER CARD */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="search-box">
            <span className="search-icon"><MagnifyingGlassIcon className="icon" /></span>
            <input
              type="text"
              placeholder="Tìm từ hoặc nghĩa..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            />
          </div>
          <div className="filter-group">
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tất cả loại</option>
              <option value="word">Từ</option>
              <option value="phrase">Cụm từ</option>
            </select>
            <select
              value={filterLevel}
              onChange={e => { setFilterLevel(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tất cả cấp độ</option>
              {(metadata.uniqueLevels || []).sort().map((l: string) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={filterTopic}
              onChange={e => { setFilterTopic(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tất cả chủ đề</option>
              {(metadata.uniqueTopics || []).sort().map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filterPartOfSpeech}
              onChange={e => { setFilterPartOfSpeech(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tất cả từ loại</option>
              {(metadata.uniquePartsOfSpeech || []).sort().map((p: string) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <select
              value={filterDeck}
              onChange={e => { setFilterDeck(e.target.value); setCurrentPage(1) }}
            >
              <option value="">Tất cả bộ thẻ</option>
              {decks.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            {selectedRows.length > 0 && (
              <button className="btn-danger-outline" onClick={() => {
                setDeleteTarget({ id: '__bulk__', word: `${selectedRows.length} items` })
              }}>
                <TrashIcon className="icon icon-inline" /> Xóa ({selectedRows.length})
              </button>
            )}
            <button
              className="btn-outline"
              onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterLevel(''); setFilterTopic(''); setFilterPartOfSpeech(''); setFilterDeck(''); setCurrentPage(1) }}
            >
              <XMarkIcon className="icon icon-inline" /> Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="card table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <ExclamationTriangleIcon className="icon icon-inline" /> {error}
          </div>
        ) : (
          <>
            <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="result-count">
                  Hiển thị <strong>{vocabularies.length}</strong> / <strong>{totalFiltered}</strong> kết quả
                  {selectedRows.length > 0 && (
                    <span className="selected-count"> · Đã chọn {selectedRows.length}</span>
                  )}
                </span>
                <button 
                  className={`btn-outline ${isSelectionMode ? 'active' : ''}`} 
                  style={{ padding: '4px 10px', fontSize: '12px', background: isSelectionMode ? 'var(--accent-light)' : 'transparent', borderColor: isSelectionMode ? 'var(--accent)' : 'var(--border)' }}
                  onClick={() => {
                    if (isSelectionMode) setSelectedRows([])
                    setIsSelectionMode(!isSelectionMode)
                  }}
                >
                  <CheckIcon className="icon icon-inline" style={{ width: 14, height: 14 }} /> 
                  {isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều'}
                </button>
              </div>
              <div className="page-buttons">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  ««
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p: number) => p - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: totalPagesState }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPagesState || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={`page-${p}`}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="page-ellipsis">…</span>
                      )}
                      <button
                        className={`page-btn ${currentPage === p ? 'active' : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  className="page-btn"
                  disabled={currentPage === totalPagesState}
                  onClick={() => setCurrentPage((p: number) => p + 1)}
                >
                  ›
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage === totalPagesState}
                  onClick={() => setCurrentPage(totalPagesState)}
                >
                  »»
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {isSelectionMode && (
                      <th className="col-check">
                        <input
                          type="checkbox"
                          checked={vocabularies.length > 0 && selectedRows.length === vocabularies.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    <th className="col-img">Ảnh</th>
                    <th className="col-sortable" onClick={() => handleSort('word')}>
                      Từ / Cụm từ <span className="sort-icon">{getSortIcon('word')}</span>
                    </th>
                    <th className="col-audio"><SpeakerWaveIcon className="icon icon-sm" /></th>
                    <th>Phát âm</th>
                    <th className="col-meanings">Nghĩa</th>
                    <th className="col-sortable" onClick={() => handleSort('partOfSpeech')}>
                      Từ loại <span className="sort-icon">{getSortIcon('partOfSpeech')}</span>
                    </th>
                    <th className="col-sortable" onClick={() => handleSort('topic')}>
                      Chủ đề <span className="sort-icon">{getSortIcon('topic')}</span>
                    </th>
                    <th className="col-sortable" onClick={() => handleSort('level')}>
                      Cấp độ <span className="sort-icon">{getSortIcon('level')}</span>
                    </th>
                    <th>Bộ thẻ</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {vocabularies.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="empty-state">
                        Không tìm thấy từ vựng phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : vocabularies.map((vocab) => (
                      <tr
                      key={vocab._id}
                      className={`data-row ${selectedRows.includes(vocab._id) ? 'selected' : ''}`}
                    >
                        {isSelectionMode && (
                          <td className="col-check">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(vocab._id)}
                              onChange={() => toggleSelectRow(vocab._id)}
                            />
                          </td>
                        )}
                        <td className="col-img">
                          {editingImageId === vocab._id ? (
                            <div className="inline-image-edit">
                              <input
                                type="text"
                                className="inline-image-input"
                                placeholder="Dán URL ảnh..."
                                value={editingImageUrl}
                                onChange={e => setEditingImageUrl(e.target.value)}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    try {
                                      const res = await fetch(`/api/vocabulary/${vocab._id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                        body: JSON.stringify({ imageUrl: editingImageUrl.trim() })
                                      })
                                      const result = await res.json()
                                      if (result.success) {
                                        vocab.imageUrl = editingImageUrl.trim()
                                      }
                                    } catch (err) { console.error(err) }
                                    setEditingImageId(null)
                                    setEditingImageUrl('')
                                  } else if (e.key === 'Escape') {
                                    setEditingImageId(null)
                                    setEditingImageUrl('')
                                  }
                                }}
                                onBlur={async () => {
                                  if (editingImageUrl.trim() && editingImageUrl.trim() !== vocab.imageUrl) {
                                    try {
                                      const res = await fetch(`/api/vocabulary/${vocab._id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                        body: JSON.stringify({ imageUrl: editingImageUrl.trim() })
                                      })
                                      const result = await res.json()
                                      if (result.success) {
                                        vocab.imageUrl = editingImageUrl.trim()
                                      }
                                    } catch (err) { console.error(err) }
                                  }
                                  setEditingImageId(null)
                                  setEditingImageUrl('')
                                }}
                                autoFocus
                              />
                              {editingImageUrl && (
                                <img
                                  className="inline-image-preview"
                                  src={editingImageUrl}
                                  alt="Preview"
                                  onError={e => (e.currentTarget.style.display = 'none')}
                                  onLoad={e => (e.currentTarget.style.display = 'block')}
                                />
                              )}
                            </div>
                          ) : vocab.imageUrl ? (
                            <img
                              className="table-thumb"
                              src={vocab.imageUrl}
                              alt={vocab.word}
                              onError={e => (e.currentTarget.src = '')}
                              onClick={() => { setEditingImageId(vocab._id); setEditingImageUrl(vocab.imageUrl || '') }}
                              style={{ cursor: 'pointer' }}
                              title="Click để sửa ảnh"
                            />
                          ) : (
                            <span
                              className="table-thumb-empty table-thumb-empty--clickable"
                              onClick={() => { setEditingImageId(vocab._id); setEditingImageUrl('') }}
                              title="Click để thêm ảnh"
                            >
                              <PhotoIcon className="icon" />
                            </span>
                          )}
                        </td>
                        <td className="col-word" onClick={() => setDetailVocab(vocab)}>
                          <span className="word-text">{vocab.word}</span>
                        </td>
                        <td className="col-audio">
                          <button
                            className="speak-btn"
                            onClick={(e) => { e.stopPropagation(); speak(vocab.word) }}
                            title="Nghe"
                          >
                            <SpeakerWaveIcon className="icon" />
                          </button>
                        </td>
                        <td className="col-pron">{vocab.pronunciation}</td>
                        <td className="col-meanings">
                          {vocab.meanings.map((m: string, i: number) => (
                            <span key={i} className="meaning-chip">{m}</span>
                          ))}
                        </td>
                        <td>
                          <span className="badge badge-pos">{vocab.partOfSpeech}</span>
                        </td>
                        <td>
                          <span className="badge badge-topic">{vocab.topic}</span>
                        </td>
                        <td>
                          <span
                            className="badge badge-level"
                            style={{ backgroundColor: getLevelColor(vocab.level) }}
                          >
                            {vocab.level}
                          </span>
                        </td>
                        <td className="col-decks">
                          {vocab.deckIds && vocab.deckIds.length > 0 ? (
                            <div className="deck-badges">
                              {vocab.deckIds.map((d: any) => (
                                <span
                                  key={d._id}
                                  className="badge badge-deck"
                                  style={{ backgroundColor: d.color + '20', color: d.color, borderColor: d.color + '40' }}
                                >
                                  {d.name}
                                </span>
                              ))}
                              <button
                                className="quick-edit-deck-btn"
                                onClick={(e) => { e.stopPropagation(); setQuickDeckVocab(vocab); setQuickDeckIds(vocab.deckIds.map((d: any) => d._id)) }}
                                title="Sửa nhanh bộ thẻ"
                              >
                                <PencilSquareIcon className="icon" style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          ) : (
                            <div className="deck-badges">
                              <span className="text-muted">—</span>
                              <button
                                className="quick-edit-deck-btn"
                                onClick={(e) => { e.stopPropagation(); setQuickDeckVocab(vocab); setQuickDeckIds([]) }}
                                title="Thêm bộ thẻ"
                              >
                                <PlusIcon className="icon" style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="col-actions">
                          <button
                            className="action-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetailVocab(vocab)}
                          >
                            <EyeIcon className="icon" />
                          </button>
                          <button
                            className="action-btn"
                            title="Sửa"
                            onClick={() => openEditModal(vocab)}
                          >
                            <PencilSquareIcon className="icon" />
                          </button>
                          <button
                            className="action-btn delete"
                            title="Xóa"
                            onClick={() => setDeleteTarget({ id: vocab._id, word: vocab.word })}
                          >
                            <TrashIcon className="icon" />
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}
