import React from 'react';
import './WritingPreviewTable.css';

interface WritingPreviewTableProps {
  words: any[];
  loading: boolean;
  error?: string | null;
  emptyMessage?: string;
  showActions?: boolean;
  onRemoveWord?: (wordId: string) => void;
  onPrioritizeWord?: (wordId: string) => void;
}

const safeNumber = (val: any) => {
  if (val === undefined || val === null || isNaN(Number(val))) return 0;
  const num = Number(val);
  if (num < 0) return 0;
  if (num > 100) return 100;
  return Math.round(num);
};

export default function WritingPreviewTable({
  words,
  loading,
  error,
  emptyMessage = "Không có từ phù hợp với bộ lọc hiện tại. Hãy đổi bộ thẻ, cấp độ hoặc giảm điều kiện lọc.",
  showActions = false,
  onRemoveWord,
  onPrioritizeWord
}: WritingPreviewTableProps) {

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

  const getTierLabel = (tier: string, overall: number) => {
    if (overall === 0) return { text: 'Chưa bắt đầu', color: '#6b7280' };
    switch (tier) {
      case 'mastered': return { text: 'Thành thạo', color: '#22c55e' };
      case 'familiar': return { text: 'Quen thuộc', color: '#3b82f6' };
      case 'learning': return { text: 'Đang học', color: '#f59e0b' };
      default: return { text: 'Chưa bắt đầu', color: '#6b7280' };
    }
  };

  const getStatusByOverall = (overall: number, writing: number) => {
    if (overall === 0) return { text: 'Chưa bắt đầu', color: '#6b7280' };
    if (writing < 40) return { text: 'Cần luyện viết', color: '#ef4444' };
    if (overall < 40) return { text: 'Cần ôn', color: '#f59e0b' };
    return { text: 'Ổn định', color: '#22c55e' };
  };

  return (
    <div className="wpt-container">
      <div className="wpt-table-scroll">
        <table className="wpt-table">
          <thead>
            <tr>
              <th className="wpt-col-vocab">TỪ VỰNG</th>
              <th className="wpt-col-level">LEVEL</th>
              <th className="wpt-col-mastery">ĐỘ THÔNG THẠO</th>
              <th className="wpt-col-status">STATUS</th>
              {showActions && <th className="wpt-col-actions">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {words.map((w, idx) => {
              const recall = safeNumber(w.skills?.recall || w.recall);
              const listening = safeNumber(w.skills?.listening || w.listening);
              const writing = safeNumber(w.skills?.writing || w.writing);
              const pronunciation = safeNumber(w.skills?.pronunciation || w.pronunciation);
              const overall = safeNumber(w.overall);
              
              const statusInfo = getStatusByOverall(overall, writing);

              return (
                <tr key={w._id || w.id || idx} className="wpt-row">
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
