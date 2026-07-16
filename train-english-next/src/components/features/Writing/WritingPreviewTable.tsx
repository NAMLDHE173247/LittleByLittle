import React, { useEffect, useMemo, useState } from 'react';
import './WritingPreviewTable.css';

type WritingSort = 'source' | 'writing_asc' | 'writing_desc';

interface PreviewWord {
  _id?: string;
  id?: string;
  wordId?: string;
  word: string;
  pronunciation?: string;
  meanings: string[];
  level?: string;
  overall?: number | string | null;
  recall?: number | string | null;
  listening?: number | string | null;
  writing?: number | string | null;
  pronunciationScore?: number | string | null;
  skills?: {
    recall?: number | string | null;
    listening?: number | string | null;
    writing?: number | string | null;
    pronunciation?: number | string | null;
  };
}

interface WritingPreviewTableProps {
  words: PreviewWord[];
  loading: boolean;
  error?: string | null;
  emptyMessage?: string;
  showActions?: boolean;
  onRemoveWord?: (wordId: string) => void;
  onPrioritizeWord?: (wordId: string) => void;
  onPracticeWordsUpdate?: (words: PreviewWord[]) => void;
}

const TIER_CONFIG = [
  { id: 'all', label: 'Tất cả', color: '#6366f1' },
  { id: 'mastered', label: 'Thành thạo', color: '#22c55e' },
  { id: 'familiar', label: 'Quen thuộc', color: '#3b82f6' },
  { id: 'learning', label: 'Đang học', color: '#f59e0b' },
  { id: 'not_started', label: 'Chưa bắt đầu', color: '#6b7280' },
];

const safeNumber = (val: unknown) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return 0;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
};

const getWordId = (word: PreviewWord): string => String(word?._id || word?.id || word?.wordId || '');

const getWritingScore = (word: PreviewWord): number => {
  const value = Number(word?.skills?.writing ?? word?.writing ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const getMasteryTier = (overall: number) => {
  if (overall === 0) return 'not_started';
  if (overall >= 90) return 'mastered';
  if (overall >= 70) return 'familiar';
  if (overall >= 40) return 'learning';
  return 'not_started';
};

export default function WritingPreviewTable({
  words,
  loading,
  error,
  emptyMessage = 'Không có từ phù hợp với bộ lọc hiện tại. Hãy đổi bộ thẻ, cấp độ hoặc giảm điều kiện lọc.',
  showActions = false,
  onRemoveWord,
  onPrioritizeWord,
  onPracticeWordsUpdate,
}: WritingPreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [writingSort, setWritingSort] = useState<WritingSort>('source');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: words.length,
      mastered: 0,
      familiar: 0,
      learning: 0,
      not_started: 0,
    };

    words.forEach((word) => {
      const tier = getMasteryTier(safeNumber(word.overall));
      counts[tier] = (counts[tier] || 0) + 1;
    });

    return counts;
  }, [words]);

  const processedWords = useMemo(() => {
    let result = words;

    if (tierFilter !== 'all') {
      result = result.filter((word) => getMasteryTier(safeNumber(word.overall)) === tierFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((word) => {
        const wordMatch = word.word?.toLowerCase().includes(query);
        const meaningMatch = word.meanings?.some((meaning: string) => meaning.toLowerCase().includes(query));
        return wordMatch || meaningMatch;
      });
    }

    if (writingSort === 'source') {
      return result;
    }

    return result
      .map((word, sourceIndex) => ({ word, sourceIndex }))
      .sort((a, b) => {
        const scoreA = getWritingScore(a.word);
        const scoreB = getWritingScore(b.word);
        const scoreDiff = writingSort === 'writing_asc' ? scoreA - scoreB : scoreB - scoreA;
        return scoreDiff || a.sourceIndex - b.sourceIndex;
      })
      .map((item) => item.word);
  }, [words, tierFilter, searchQuery, writingSort]);

  const totalPages = Math.max(1, Math.ceil(processedWords.length / pageSize));

  const paginatedWords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedWords.slice(startIndex, startIndex + pageSize);
  }, [processedWords, currentPage, pageSize]);

  const pageStart = processedWords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = processedWords.length === 0 ? 0 : Math.min(currentPage * pageSize, processedWords.length);

  const finalPracticeWords = useMemo(() => {
    if (isSelectionMode) {
      if (selectedWordIds.size === 0) return [];
      return processedWords.filter((word) => selectedWordIds.has(getWordId(word)));
    }
    return processedWords;
  }, [processedWords, isSelectionMode, selectedWordIds]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, tierFilter, writingSort, pageSize]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage((page) => Math.min(page, totalPages));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [totalPages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedWordIds((prev) => {
        const validIds = new Set(processedWords.map(getWordId).filter(Boolean));
        let changed = false;
        const next = new Set(prev);
        for (const id of next) {
          if (!validIds.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [processedWords]);

  useEffect(() => {
    onPracticeWordsUpdate?.(finalPracticeWords);
  }, [finalPracticeWords, onPracticeWordsUpdate]);

  const getStatusByOverall = (overall: number, writing: number) => {
    if (overall === 0) return { text: 'Chưa bắt đầu', color: '#6b7280' };
    if (writing < 40) return { text: 'Cần luyện viết', color: '#ef4444' };
    if (overall < 40) return { text: 'Cần ôn', color: '#f59e0b' };
    return { text: 'Ổn định', color: '#22c55e' };
  };

  const handleSelectAllPage = (checked: boolean) => {
    const next = new Set(selectedWordIds);
    paginatedWords.forEach((word) => {
      const id = getWordId(word);
      if (!id) return;
      if (checked) next.add(id);
      else next.delete(id);
    });
    setSelectedWordIds(next);
  };

  const handleSelectWord = (id: string) => {
    if (!id) return;
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllPageSelected = paginatedWords.length > 0 && paginatedWords.every((word) => selectedWordIds.has(getWordId(word)));
  const isSomePageSelected = paginatedWords.some((word) => selectedWordIds.has(getWordId(word)));

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  const renderPagination = () => {
    if (processedWords.length === 0) return null;

    return (
      <div className="wpt-pagination" aria-label="Phân trang danh sách từ vựng Writing">
        <button className="wpt-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} aria-label="Về trang đầu">
          ««
        </button>
        <button className="wpt-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} aria-label="Trang trước">
          ‹
        </button>
        {visiblePages.map((page, index, pages) => (
          <React.Fragment key={page}>
            {index > 0 && pages[index - 1] !== page - 1 && <span className="wpt-page-ellipsis">...</span>}
            <button
              className={`wpt-page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
              aria-label={`Đến trang ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          </React.Fragment>
        ))}
        <button className="wpt-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} aria-label="Trang sau">
          ›
        </button>
        <button className="wpt-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Đến trang cuối">
          »»
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="wpt-container wpt-loading">
        <div className="wpt-spinner"></div>
        <p>Đang tải danh sách từ vựng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wpt-container wpt-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="wpt-container wpt-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="wpt-container">
      <div className="wpt-filter-bar">
        <div className="wpt-search-wrapper">
          <input
            type="text"
            className="wpt-search-input"
            placeholder="Tìm từ vựng..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="wpt-tier-pills">
          {TIER_CONFIG.map((tier) => (
            <button
              key={tier.id}
              className={`wpt-pill ${tierFilter === tier.id ? 'active' : ''}`}
              style={{
                '--pill-color': tier.color,
                borderColor: tierFilter === tier.id ? tier.color : 'var(--border)',
                backgroundColor: tierFilter === tier.id ? `${tier.color}15` : 'var(--bg-card)',
                color: tierFilter === tier.id ? tier.color : 'var(--text-secondary)',
              } as React.CSSProperties}
              onClick={() => setTierFilter(tier.id)}
            >
              <span className="wpt-pill-dot" style={{ backgroundColor: tier.color }}></span>
              {tier.label} ({tierCounts[tier.id]})
            </button>
          ))}
        </div>

        <div className="wpt-table-controls">
          <label className="wpt-control">
            <span>Sort</span>
            <select value={writingSort} onChange={(event) => setWritingSort(event.target.value as WritingSort)}>
              <option value="source">Theo thứ tự nguồn</option>
              <option value="writing_asc">Writing thấp → cao</option>
              <option value="writing_desc">Writing cao → thấp</option>
            </select>
          </label>

          <label className="wpt-control">
            <span>Hiển thị</span>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>
      </div>

      <div className="wpt-header-bar">
        <div className="wpt-header-left">
          <button
            className={`wpt-btn-toggle ${isSelectionMode ? 'active' : ''}`}
            onClick={() => {
              if (isSelectionMode) setSelectedWordIds(new Set());
              setIsSelectionMode(!isSelectionMode);
            }}
          >
            {isSelectionMode ? '✓ Hủy chọn' : '✓ Chọn nhiều'}
          </button>
        </div>

        <div className="wpt-header-right">
          <div className="wpt-results-info">
            {processedWords.length > 0 ? (
              <>
                Hiển thị <strong>{pageStart}</strong>-<strong>{pageEnd}</strong> / <strong>{processedWords.length}</strong> kết quả
              </>
            ) : (
              <>Không có kết quả phù hợp</>
            )}
            {selectedWordIds.size > 0 && (
              <span className="wpt-selected-count"> · Đã chọn {selectedWordIds.size}</span>
            )}
          </div>

          <div className="wpt-header-pagination">
            {renderPagination()}
          </div>
        </div>
      </div>

      <div className="wpt-table-scroll">
        <table className="wpt-table">
          <thead>
            <tr>
              {isSelectionMode && (
                <th className="wpt-col-checkbox">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = !isAllPageSelected && isSomePageSelected;
                    }}
                    onChange={(event) => handleSelectAllPage(event.target.checked)}
                    aria-label="Chọn tất cả từ trên trang này"
                    title="Chọn tất cả từ trên trang này"
                  />
                </th>
              )}
              <th className="wpt-col-vocab">Từ vựng</th>
              <th className="wpt-col-level">Level</th>
              <th className="wpt-col-mastery">Độ thông thạo</th>
              <th className="wpt-col-status">Status</th>
              {showActions && <th className="wpt-col-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {processedWords.length === 0 ? (
              <tr>
                <td colSpan={isSelectionMode ? 6 : 5} className="wpt-empty-row">
                  {emptyMessage}
                </td>
              </tr>
            ) : paginatedWords.map((word, index) => {
              const id = getWordId(word);
              const recall = safeNumber(word.skills?.recall ?? word.recall);
              const listening = safeNumber(word.skills?.listening ?? word.listening);
              const writing = safeNumber(word.skills?.writing ?? word.writing);
              const pronunciation = safeNumber(word.skills?.pronunciation ?? word.pronunciation);
              const overall = safeNumber(word.overall);
              const statusInfo = getStatusByOverall(overall, writing);
              const isSelected = selectedWordIds.has(id);

              return (
                <tr
                  key={id || index}
                  className={`wpt-row ${isSelected ? 'wpt-row-selected' : ''}`}
                  onClick={() => {
                    if (isSelectionMode) handleSelectWord(id);
                  }}
                  style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                >
                  {isSelectionMode && (
                    <td className="wpt-col-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        aria-label={`Chọn từ ${word.word || ''}`}
                      />
                    </td>
                  )}

                  <td className="wpt-col-vocab">
                    <div className="wpt-vocab-word">{word.word}</div>
                    {word.pronunciation && <div className="wpt-vocab-pron">/{word.pronunciation}/</div>}
                    {word.meanings && word.meanings.length > 0 && (
                      <div className="wpt-vocab-meaning">{word.meanings.join(', ')}</div>
                    )}
                  </td>

                  <td className="wpt-col-level">
                    <span className="wpt-level-badge">{word.level || 'B1'}</span>
                  </td>

                  <td className="wpt-col-mastery">
                    <div className="wpt-mastery-grid">
                      <div className="wpt-mastery-item wpt-writing-highlight">
                        <span className="wpt-m-label">Writing</span>
                        <div className="wpt-m-bar-wrap">
                          <div className="wpt-m-bar" style={{ width: `${writing}%`, backgroundColor: '#10b981' }} />
                        </div>
                        <span className="wpt-m-val">{writing}</span>
                      </div>

                      <div className="wpt-mastery-item">
                        <span className="wpt-m-label">R</span>
                        <div className="wpt-m-bar-wrap">
                          <div className="wpt-m-bar" style={{ width: `${recall}%`, backgroundColor: '#3b82f6' }} />
                        </div>
                        <span className="wpt-m-val">{recall}</span>
                      </div>

                      <div className="wpt-mastery-item">
                        <span className="wpt-m-label">L</span>
                        <div className="wpt-m-bar-wrap">
                          <div className="wpt-m-bar" style={{ width: `${listening}%`, backgroundColor: '#f59e0b' }} />
                        </div>
                        <span className="wpt-m-val">{listening}</span>
                      </div>

                      <div className="wpt-mastery-item">
                        <span className="wpt-m-label">P</span>
                        <div className="wpt-m-bar-wrap">
                          <div className="wpt-m-bar" style={{ width: `${pronunciation}%`, backgroundColor: '#8b5cf6' }} />
                        </div>
                        <span className="wpt-m-val">{pronunciation}</span>
                      </div>

                      <div className="wpt-mastery-item wpt-overall-wrap">
                        <span className="wpt-m-label">Overall</span>
                        <span className="wpt-overall-val">{overall}</span>
                      </div>
                    </div>
                  </td>

                  <td className="wpt-col-status">
                    <span
                      className="wpt-status-badge"
                      style={{ color: statusInfo.color, borderColor: statusInfo.color, backgroundColor: `${statusInfo.color}15` }}
                    >
                      {statusInfo.text}
                    </span>
                  </td>

                  {showActions && (
                    <td className="wpt-col-actions">
                      {onPrioritizeWord && (
                        <button className="wpt-btn wpt-btn-up" onClick={() => onPrioritizeWord(id)} title="Ưu tiên">
                          ↑
                        </button>
                      )}
                      {onRemoveWord && (
                        <button className="wpt-btn wpt-btn-del" onClick={() => onRemoveWord(id)} title="Loại bỏ">
                          ×
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
