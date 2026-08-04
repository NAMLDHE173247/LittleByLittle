import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, PlusIcon, DocumentTextIcon, ChatBubbleLeftRightIcon,
  TagIcon, MagnifyingGlassIcon, TrashIcon, XMarkIcon, ExclamationTriangleIcon,
  CheckIcon, SpeakerWaveIcon, PhotoIcon, PencilSquareIcon, EyeIcon,
  ChevronDownIcon, CodeBracketIcon
} from '@heroicons/react/24/outline'
import { BookOpenIcon as BookOpenSolidIcon } from '@heroicons/react/24/solid'
import { useVocabularyExport } from '@/hooks/useVocabularyExport';
import type { ImageFilter } from '@/types';

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
    filterImage: ImageFilter; setFilterImage: (value: ImageFilter) => void;
  };
  pagination: {
    currentPage: number; setCurrentPage: any;
    itemsPerPage: 10 | 20 | 50 | 100; setItemsPerPage: (value: 10 | 20 | 50 | 100) => void;
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
    setQuickDeckVocab: any; setQuickDeckIds: any; speak: any; getLevelColor: any; fetchVocabularies: () => void;
    authHeaders: () => Record<string, string>;
  };
}

export default function VocabularyPage({
  data, filters, pagination, sorting, selection, actions
}: VocabularyPageProps) {
  const { vocabularies, loading, error, metadata, decks, totalFiltered } = data;
  const { searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterLevel, setFilterLevel, filterTopic, setFilterTopic, filterPartOfSpeech, setFilterPartOfSpeech, filterDeck, setFilterDeck, filterImage, setFilterImage } = filters;
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalPagesState } = pagination;
  const { sortField, handleSort, getSortIcon } = sorting;
  const { selectedRows, isSelectionMode, setIsSelectionMode, toggleSelectAll, toggleSelectRow, setSelectedRows } = selection;
  const { openAddModal, openEditModal, setDetailVocab, setDeleteTarget, setShowImportModal, setImportResult, setImportError, setImportJsonText, setQuickDeckVocab, setQuickDeckIds, speak, getLevelColor, authHeaders, fetchVocabularies } = actions;

  const { exportVocabularies, exporting, error: exportError, setError: setExportError } = useVocabularyExport();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string>('');
  const [savingImageId, setSavingImageId] = useState<string | null>(null);
  const [imagePreviewValid, setImagePreviewValid] = useState(false);
  const [imageEditError, setImageEditError] = useState('');
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  const resetSelectionAndGoToPage = (page: number) => {
    setSelectedRows([]);
    setCurrentPage(page);
  };

  const saveInlineImage = async (vocabId: string) => {
    if (savingImageId) return;
    const imageUrl = editingImageUrl.trim();
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      setImageEditError('URL ảnh phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    if (imageUrl && !imagePreviewValid) {
      setImageEditError('Ảnh chưa tải thành công, vui lòng kiểm tra lại URL.');
      return;
    }

    setSavingImageId(vocabId);
    setImageEditError('');
    try {
      const res = await fetch(`/api/vocabulary/${vocabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ imageUrl }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setImageEditError(result.message || 'Không thể lưu ảnh.');
        return;
      }
      setEditingImageId(null);
      setEditingImageUrl('');
      setImagePreviewValid(false);
      setImageEditError('');
      setSelectedRows((prev: string[]) => prev.filter((id: string) => id !== vocabId));
      fetchVocabularies();
    } catch {
      setImageEditError('Lỗi kết nối khi lưu ảnh.');
    } finally {
      setSavingImageId(null);
    }
  };

  const openInlineImageEditor = (vocabId: string, imageUrl = '') => {
    setEditingImageId(vocabId);
    setEditingImageUrl(imageUrl);
    setImagePreviewValid(false);
    setImageEditError('');
  };

  const applyPageInput = () => {
    const parsed = Number(pageInput);
    const maxPage = Math.max(1, totalPagesState);
    const target = Number.isFinite(parsed) ? Math.min(maxPage, Math.max(1, Math.floor(parsed))) : 1;
    resetSelectionAndGoToPage(target);
  };

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  useEffect(() => {
    if (exportError) {
      alert(exportError);
      setExportError('');
    }
  }, [exportError, setExportError]);

  const handleExport = (format: 'json' | 'txt' | 'csv') => {
    setExportMenuOpen(false);
    exportVocabularies({
      format,
      query: {
        search: searchQuery,
        type: filterCategory,
        level: filterLevel,
        topic: filterTopic,
        pos: filterPartOfSpeech,
        deck: filterDeck,
        image: filterImage,
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Từ vựng</h1>
          <p className="page-subtitle">Quản lý bộ sưu tập từ vựng của bạn</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="export-dropdown" ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              className="btn-outline"
              onClick={() => setExportMenuOpen(o => !o)}
              disabled={exporting || (!totalFiltered && !metadata?.total)}
            >
              <ArrowUpTrayIcon className="icon icon-inline" /> {exporting ? 'Đang xuất...' : 'Export'}
              <ChevronDownIcon className="icon icon-inline" style={{ width: 14, height: 14 }} />
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button className="export-menu-item" onClick={() => handleExport('json')}>
                  <CodeBracketIcon className="icon icon-inline" />
                  <div className="export-menu-text">
                    <span className="export-menu-title">Xuất JSON</span>
                    <span className="export-menu-desc">Dữ liệu để import lại</span>
                  </div>
                </button>
                <button className="export-menu-item" onClick={() => handleExport('txt')}>
                  <DocumentTextIcon className="icon icon-inline" />
                  <div className="export-menu-text">
                    <span className="export-menu-title">Xuất TXT</span>
                    <span className="export-menu-desc">Dễ đọc, kèm link ảnh</span>
                  </div>
                </button>
                <button className="export-menu-item" onClick={() => handleExport('csv')}>
                  <DocumentTextIcon className="icon icon-inline" />
                  <div className="export-menu-text">
                    <span className="export-menu-title">Xuất CSV</span>
                    <span className="export-menu-desc">Chỉ từ & nghĩa (chuẩn Excel)</span>
                  </div>
                </button>
              </div>
            )}
          </div>
          <button
            className="btn-danger"
            onClick={() => setDeleteTarget({ id: '__clear_all__', word: '' })}
            disabled={!totalFiltered && !metadata?.total}
            title="Xóa toàn bộ từ vựng trong cơ sở dữ liệu"
          >
            <TrashIcon className="icon icon-inline" /> Xóa toàn bộ
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
              onChange={e => { setSearchQuery(e.target.value); resetSelectionAndGoToPage(1) }}
            />
          </div>
          <div className="filter-group">
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); resetSelectionAndGoToPage(1) }}
            >
              <option value="">Tất cả loại</option>
              <option value="word">Từ</option>
              <option value="phrase">Cụm từ</option>
            </select>
            <select
              value={filterLevel}
              onChange={e => { setFilterLevel(e.target.value); resetSelectionAndGoToPage(1) }}
            >
              <option value="">Tất cả cấp độ</option>
              {(metadata.uniqueLevels || []).sort().map((l: string) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              value={filterTopic}
              onChange={e => { setFilterTopic(e.target.value); resetSelectionAndGoToPage(1) }}
            >
              <option value="">Tất cả chủ đề</option>
              {(metadata.uniqueTopics || []).sort().map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filterPartOfSpeech}
              onChange={e => { setFilterPartOfSpeech(e.target.value); resetSelectionAndGoToPage(1) }}
            >
              <option value="">Tất cả từ loại</option>
              {(metadata.uniquePartsOfSpeech || []).sort().map((p: string) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <select
              value={filterDeck}
              onChange={e => { setFilterDeck(e.target.value); resetSelectionAndGoToPage(1) }}
            >
              <option value="">Tất cả bộ thẻ</option>
              {decks.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <select
              value={filterImage}
              aria-label="Lọc theo trạng thái ảnh"
              onChange={e => { setFilterImage(e.target.value as ImageFilter); resetSelectionAndGoToPage(1) }}
            >
              <option value="all">Tất cả ảnh</option>
              <option value="with">Có ảnh</option>
              <option value="without">Chưa có ảnh</option>
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
              onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterLevel(''); setFilterTopic(''); setFilterPartOfSpeech(''); setFilterDeck(''); setFilterImage('all'); resetSelectionAndGoToPage(1) }}
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
                {selectedRows.length > 0 && (
                  <button 
                    className="btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => {
                      const selectedVocabs = vocabularies.filter((v: any) => selectedRows.includes(v._id));
                      sessionStorage.setItem('writingWords', JSON.stringify(selectedVocabs));
                      window.location.href = '/writing';
                    }}
                  >
                    <PencilSquareIcon className="icon icon-inline" style={{ width: 14, height: 14 }} /> 
                    Writing
                  </button>
                )}
              </div>
              <div className="page-buttons">
                <label className="page-jump-control">
                  <span>Trang</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, totalPagesState)}
                    value={pageInput}
                    onChange={e => setPageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') applyPageInput() }}
                    aria-label="Nhập số trang"
                  />
                  <span>/ {Math.max(1, totalPagesState)}</span>
                </label>
                <label className="page-size-control">
                  <span>Hiển thị</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value) as 10 | 20 | 50 | 100);
                      resetSelectionAndGoToPage(1);
                    }}
                    aria-label="Số bản ghi mỗi trang"
                  >
                    {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <button className="page-btn" onClick={applyPageInput} aria-label="Áp dụng số trang">Đi</button>
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => resetSelectionAndGoToPage(1)}
                >
                  ««
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => { setSelectedRows([]); setCurrentPage((p: number) => Math.max(1, p - 1)) }}
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
                        onClick={() => resetSelectionAndGoToPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  className="page-btn"
                  disabled={currentPage >= Math.max(1, totalPagesState)}
                  onClick={() => { setSelectedRows([]); setCurrentPage((p: number) => Math.min(Math.max(1, totalPagesState), p + 1)) }}
                >
                  ›
                </button>
                <button
                  className="page-btn"
                  disabled={currentPage >= Math.max(1, totalPagesState)}
                  onClick={() => resetSelectionAndGoToPage(Math.max(1, totalPagesState))}
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
                                onChange={e => {
                                  const value = e.target.value;
                                  const trimmedValue = value.trim();
                                  setEditingImageUrl(value);
                                  setImagePreviewValid(false);
                                  setImageEditError(trimmedValue && !/^https?:\/\//i.test(trimmedValue)
                                    ? 'URL ảnh phải bắt đầu bằng http:// hoặc https://'
                                    : '');
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void saveInlineImage(vocab._id)
                                  } else if (e.key === 'Escape' && !savingImageId) {
                                    setEditingImageId(null)
                                    setEditingImageUrl('')
                                    setImagePreviewValid(false)
                                    setImageEditError('')
                                  }
                                }}
                                autoFocus
                                disabled={savingImageId === vocab._id}
                              />
                              {editingImageUrl && (
                                <img
                                  className="inline-image-preview"
                                  src={editingImageUrl}
                                  alt="Preview"
                                  style={{ display: imagePreviewValid ? 'block' : 'none' }}
                                  onError={() => { setImagePreviewValid(false); setImageEditError('Ảnh chưa tải thành công, vui lòng kiểm tra lại URL.') }}
                                  onLoad={() => { setImagePreviewValid(true); setImageEditError('') }}
                                />
                              )}
                              <div className="inline-image-actions">
                                <button
                                  type="button"
                                  className="btn-primary btn-sm"
                                  onClick={() => void saveInlineImage(vocab._id)}
                                  disabled={savingImageId === vocab._id || (!!editingImageUrl.trim() && !imagePreviewValid)}
                                >
                                  {savingImageId === vocab._id ? 'Đang lưu...' : 'Lưu'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-outline btn-sm"
                                  onClick={() => { setEditingImageId(null); setEditingImageUrl(''); setImagePreviewValid(false); setImageEditError('') }}
                                  disabled={savingImageId === vocab._id}
                                >Hủy</button>
                              </div>
                              {imageEditError && <span className="inline-image-error" role="alert">{imageEditError}</span>}
                            </div>
                          ) : vocab.imageUrl ? (
                            <img
                              className="table-thumb"
                              src={vocab.imageUrl}
                              alt={vocab.word}
                              onError={e => (e.currentTarget.src = '')}
                              onClick={() => openInlineImageEditor(vocab._id, vocab.imageUrl || '')}
                              style={{ cursor: 'pointer' }}
                              title="Click để sửa ảnh"
                            />
                          ) : (
                            <span
                              className="table-thumb-empty table-thumb-empty--clickable"
                               onClick={() => openInlineImageEditor(vocab._id)}
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
                              {vocab.deckIds.map((d: any, i: number) => {
                                if (!d) return null;
                                const deckId = typeof d === 'string' ? d : d._id;
                                const deck = decks.find((dk: any) => dk._id === deckId) || (typeof d === 'object' ? d : null);
                                if (!deck) return null;
                                return (
                                  <span
                                    key={deck._id || i}
                                    className="badge badge-deck"
                                    style={{ backgroundColor: deck.color + '20', color: deck.color, borderColor: deck.color + '40' }}
                                  >
                                    {deck.name}
                                  </span>
                                );
                              })}
                              <button
                                className="quick-edit-deck-btn"
                                onClick={(e) => { e.stopPropagation(); setQuickDeckVocab(vocab); setQuickDeckIds(vocab.deckIds.map((d: any) => typeof d === 'string' ? d : d?._id).filter(Boolean)) }}
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
