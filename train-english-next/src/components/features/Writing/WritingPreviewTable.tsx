import React, { useState, useMemo, useEffect } from 'react';
import './WritingPreviewTable.css';

interface WritingPreviewTableProps {
  words: any[];
  loading: boolean;
  error?: string | null;
  emptyMessage?: string;
  showActions?: boolean;
  onRemoveWord?: (wordId: string) => void;
  onPrioritizeWord?: (wordId: string) => void;
  onPracticeWordsUpdate?: (words: any[]) => void;
}

const safeNumber = (val: any) => {
  if (val === undefined || val === null || isNaN(Number(val))) return 0;
  const num = Number(val);
  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
};

const getMasteryTier = (overall: number) => {
  if (overall === 0) return 'not_started';
  if (overall >= 90) return 'mastered';
  if (overall >= 70) return 'familiar';
  if (overall >= 40) return 'learning';
  return 'not_started';
};

const TIER_CONFIG = [
  { id: 'all', label: 'Tất cả', color: '#6366f1' },
  { id: 'mastered', label: 'Thành thạo', color: '#22c55e' },
  { id: 'familiar', label: 'Quen thuộc', color: '#3b82f6' },
  { id: 'learning', label: 'Đang học', color: '#f59e0b' },
  { id: 'not_started', label: 'Chưa bắt đầu', color: '#6b7280' }
];

export default function WritingPreviewTable({
  words,
  loading,
  error,
  emptyMessage = "Không có từ phù hợp với bộ lọc hiện tại. Hãy đổi bộ thẻ, cấp độ hoặc giảm điều kiện lọc.",
  showActions = false,
  onRemoveWord,
  onPrioritizeWord,
  onPracticeWordsUpdate
}: WritingPreviewTableProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  // Count tiers based on ALL words
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: words.length,
      mastered: 0,
      familiar: 0,
      learning: 0,
      not_started: 0
    };
    
    words.forEach(w => {
      const overall = safeNumber(w.overall);
      const tier = getMasteryTier(overall);
      counts[tier] = (counts[tier] || 0) + 1;
    });
    
    return counts;
  }, [words]);

  // Filtered words
  const filteredWords = useMemo(() => {
    let result = words;
    
    // Tier filter
    if (tierFilter !== 'all') {
      result = result.filter(w => getMasteryTier(safeNumber(w.overall)) === tierFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(w => {
        const wordMatch = w.word?.toLowerCase().includes(query);
        const meaningMatch = w.meanings?.some((m: string) => m.toLowerCase().includes(query));
        return wordMatch || meaningMatch;
      });
    }
    
    return result;
  }, [words, tierFilter, searchQuery]);

  // Final practice words
  const finalPracticeWords = useMemo(() => {
    if (isSelectionMode && selectedWordIds.size > 0) {
      return words.filter(w => selectedWordIds.has(w._id || w.id));
    }
    return filteredWords;
  }, [words, filteredWords, isSelectionMode, selectedWordIds]);

  // Clean up selected IDs if words are removed from original list
  useEffect(() => {
    const validIds = new Set(words.map(w => w._id || w.id));
    setSelectedWordIds(prev => {
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
  }, [words]);

  // Notify parent
  useEffect(() => {
    if (onPracticeWordsUpdate) {
      onPracticeWordsUpdate(finalPracticeWords);
    }
  }, [finalPracticeWords, onPracticeWordsUpdate]);

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
        <p>⚠️ {error}</p>
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

  const getStatusByOverall = (overall: number, writing: number) => {
    if (overall === 0) return { text: 'Chưa bắt đầu', color: '#6b7280' };
    if (writing < 40) return { text: 'Cần luyện viết', color: '#ef4444' };
    if (overall < 40) return { text: 'Cần ôn', color: '#f59e0b' };
    return { text: 'Ổn định', color: '#22c55e' };
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedWordIds);
      filteredWords.forEach(w => newSelected.add(w._id || w.id));
      setSelectedWordIds(newSelected);
    } else {
      const newSelected = new Set(selectedWordIds);
      filteredWords.forEach(w => newSelected.delete(w._id || w.id));
      setSelectedWordIds(newSelected);
    }
  };

  const handleSelectWord = (id: string) => {
    const next = new Set(selectedWordIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedWordIds(next);
  };

  const isAllFilteredSelected = filteredWords.length > 0 && filteredWords.every(w => selectedWordIds.has(w._id || w.id));
  const isSomeFilteredSelected = filteredWords.some(w => selectedWordIds.has(w._id || w.id));

  return (
    <div className="wpt-container">
      {/* FILTER BAR */}
      <div className="wpt-filter-bar">
        <div className="wpt-search-wrapper">
          <input 
            type="text" 
            className="wpt-search-input" 
            placeholder="Tìm từ vựng..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="wpt-tier-pills">
          {TIER_CONFIG.map(tier => (
            <button
              key={tier.id}
              className={`wpt-pill ${tierFilter === tier.id ? 'active' : ''}`}
              style={{ 
                '--pill-color': tier.color, 
                borderColor: tierFilter === tier.id ? tier.color : 'var(--border)',
                backgroundColor: tierFilter === tier.id ? `${tier.color}15` : 'var(--bg-card)',
                color: tierFilter === tier.id ? tier.color : 'var(--text-secondary)'
              } as React.CSSProperties}
              onClick={() => setTierFilter(tier.id)}
            >
              <span className="wpt-pill-dot" style={{ backgroundColor: tier.color }}></span>
              {tier.label} ({tierCounts[tier.id]})
            </button>
          ))}
        </div>
      </div>

      {/* HEADER BAR */}
      <div className="wpt-header-bar">
        <div className="wpt-results-info">
          Hiển thị <strong>{filteredWords.length}</strong> / <strong>{words.length}</strong> kết quả
          {selectedWordIds.size > 0 && (
            <span className="wpt-selected-count"> · Đã chọn {selectedWordIds.size}</span>
          )}
        </div>
        <button 
          className={`wpt-btn-toggle ${isSelectionMode ? 'active' : ''}`}
          onClick={() => {
            if (isSelectionMode) {
              setSelectedWordIds(new Set());
            }
            setIsSelectionMode(!isSelectionMode);
          }}
        >
          {isSelectionMode ? '✓ Hủy chọn' : '✓ Chọn nhiều'}
        </button>
      </div>

      {/* TABLE */}
      <div className="wpt-table-scroll">
        <table className="wpt-table">
          <thead>
            <tr>
              {isSelectionMode && (
                <th className="wpt-col-checkbox">
                  <input 
                    type="checkbox" 
                    checked={isAllFilteredSelected}
                    ref={input => {
                      if (input) input.indeterminate = !isAllFilteredSelected && isSomeFilteredSelected;
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              <th className="wpt-col-vocab">TỪ VỰNG</th>
              <th className="wpt-col-level">LEVEL</th>
              <th className="wpt-col-mastery">ĐỘ THÔNG THẠO</th>
              <th className="wpt-col-status">STATUS</th>
              {showActions && <th className="wpt-col-actions">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {filteredWords.length === 0 ? (
              <tr>
                <td colSpan={isSelectionMode ? 6 : 5} className="wpt-empty-row">
                  {emptyMessage}
                </td>
              </tr>
            ) : filteredWords.map((w, idx) => {
              const recall = safeNumber(w.skills?.recall || w.recall);
              const listening = safeNumber(w.skills?.listening || w.listening);
              const writing = safeNumber(w.skills?.writing || w.writing);
              const pronunciation = safeNumber(w.skills?.pronunciation || w.pronunciation);
              const overall = safeNumber(w.overall);
              
              const statusInfo = getStatusByOverall(overall, writing);
              const isSelected = selectedWordIds.has(w._id || w.id);

              return (
                <tr 
                  key={w._id || w.id || idx} 
                  className={`wpt-row ${isSelected ? 'wpt-row-selected' : ''}`}
                  onClick={() => {
                    if (isSelectionMode) handleSelectWord(w._id || w.id);
                  }}
                  style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                >
                  {isSelectionMode && (
                    <td className="wpt-col-checkbox">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        readOnly
                      />
                    </td>
                  )}
                  <td className="wpt-col-vocab">
                    <div className="wpt-vocab-word">{w.word}</div>
                    {w.pronunciation && <div className="wpt-vocab-pron">/{w.pronunciation}/</div>}
                    {w.meanings && w.meanings.length > 0 && (
                      <div className="wpt-vocab-meaning">{w.meanings.join(', ')}</div>
                    )}
                  </td>
                  <td className="wpt-col-level">
                    <span className="wpt-level-badge">{w.level || 'B1'}</span>
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
                    <span className="wpt-status-badge" style={{ color: statusInfo.color, borderColor: statusInfo.color, backgroundColor: `${statusInfo.color}15` }}>
                      {statusInfo.text}
                    </span>
                  </td>
                  {showActions && (
                    <td className="wpt-col-actions">
                      {onPrioritizeWord && (
                        <button className="wpt-btn wpt-btn-up" onClick={() => onPrioritizeWord(w._id || w.id)} title="Ưu tiên">
                          ↑
                        </button>
                      )}
                      {onRemoveWord && (
                        <button className="wpt-btn wpt-btn-del" onClick={() => onRemoveWord(w._id || w.id)} title="Loại bỏ">
                          ✕
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
