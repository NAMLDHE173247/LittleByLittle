"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/AuthContext";
import { useGlobalData } from "@/components/providers/GlobalDataProvider";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  SpeakerWaveIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface DeckMasteryViewProps {
  deckId: string;
}

const DEBOUNCE_DELAY = 400;

export default function DeckMasteryView({ deckId }: DeckMasteryViewProps) {
  const { authHeaders } = useAuth();
  const { speak } = useGlobalData();
  const router = useRouter();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Selected words state (Record of wordId -> VocabItem)
  const [selectedWordsById, setSelectedWordsById] = useState<Record<string, any>>({});

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        deckId,
        search: debouncedSearch,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/words?${params}`, {
        headers: authHeaders()
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch data");
      }
      if (json.success) {
        setData(json.data.words || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
      } else {
        throw new Error(json.message || "Failed to fetch data");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [deckId, debouncedSearch, page, authHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'mastered': return '#22c55e'; // green
      case 'familiar': return '#3b82f6'; // blue
      case 'learning': return '#eab308'; // yellow
      default: return '#9ca3af'; // gray
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'mastered': return 'Mastered';
      case 'familiar': return 'Familiar';
      case 'learning': return 'Learning';
      default: return 'Not Started';
    }
  };

  // --- Selection Logic ---
  const currentItemsOnPage = useMemo(() => data, [data]);
  
  const selectedCountOnPage = currentItemsOnPage.filter(item => selectedWordsById[item.wordId]).length;
  const allOnPageSelected = currentItemsOnPage.length > 0 && selectedCountOnPage === currentItemsOnPage.length;
  const isIndeterminate = selectedCountOnPage > 0 && selectedCountOnPage < currentItemsOnPage.length;

  const toggleSelectAllPage = () => {
    setSelectedWordsById(prev => {
      const next = { ...prev };
      if (allOnPageSelected) {
        // Deselect all on current page
        currentItemsOnPage.forEach(item => {
          delete next[item.wordId];
        });
      } else {
        // Select all on current page
        currentItemsOnPage.forEach(item => {
          next[item.wordId] = item;
        });
      }
      return next;
    });
  };

  const toggleSelectRow = (item: any) => {
    setSelectedWordsById(prev => {
      const next = { ...prev };
      if (next[item.wordId]) {
        delete next[item.wordId];
      } else {
        next[item.wordId] = item;
      }
      return next;
    });
  };

  const handleSpeak = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (word) {
      speak(word);
    }
  };

  const handlePracticeWriting = async () => {
    const selectedArray = Object.values(selectedWordsById);
    if (selectedArray.length === 0) return;

    const validWords = selectedArray.filter(w => w && w.word);

    if (validWords.length === 0) {
      toast.error("Không có từ nào hợp lệ để luyện tập!");
      return;
    }

    sessionStorage.setItem('writingWords', JSON.stringify(validWords));
    router.push('/writing');
  };

  const totalSelectedCount = Object.keys(selectedWordsById).length;


  return (
    <div className="deck-mastery-view">
      <div className="dm-header-actions">
        <div className="dm-search-box">
          <MagnifyingGlassIcon className="icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm từ vựng..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="dm-loading">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="dm-error">
          <ExclamationTriangleIcon className="icon" />
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchData}>Thử lại</button>
        </div>
      ) : data.length === 0 ? (
        <div className="dm-empty">
          <p>Không có từ vựng nào phù hợp.</p>
        </div>
      ) : (
        <div className="dm-table-container">
          <table className="dm-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input 
                    type="checkbox" 
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleSelectAllPage}
                    title="Chọn/Bỏ chọn tất cả trang hiện tại"
                  />
                </th>
                <th>Từ vựng</th>
                <th>Nghĩa</th>
                <th>Cấp độ</th>
                <th style={{ textAlign: 'right' }}>Tổng điểm</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const isSelected = !!selectedWordsById[item.wordId];
                const hasMeanings = item.meanings && item.meanings.length > 0;

                return (
                  <tr key={item.wordId || idx} className={isSelected ? "selected-row" : ""}>
                    <td style={{ textAlign: "center" }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectRow(item)}
                      />
                    </td>
                    <td>
                      <div className="dm-word-col">
                        <div className="dm-word-row">
                          <span className="dm-word">{item.word}</span>
                          <button 
                            className="dm-speak-btn" 
                            onClick={(e) => handleSpeak(e, item.word)}
                            disabled={!item.word}
                            aria-label={`Phát âm từ ${item.word}`}
                            title="Phát âm"
                          >
                            <SpeakerWaveIcon className="icon" />
                          </button>
                        </div>
                        {item.pronunciation && <span className="dm-pron">/{item.pronunciation}/</span>}
                      </div>
                    </td>
                    <td>
                      <span className="dm-meanings" style={{ color: hasMeanings ? "inherit" : "var(--text-muted)", fontStyle: hasMeanings ? "normal" : "italic" }}>
                        {hasMeanings ? item.meanings.join(", ") : "Chưa có nghĩa"}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="dm-tier-badge" 
                        style={{ 
                          backgroundColor: `${getLevelColor(item.tier)}15`,
                          color: getLevelColor(item.tier),
                          border: `1px solid ${getLevelColor(item.tier)}30`
                        }}
                      >
                        {getLevelLabel(item.tier)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="dm-score">
                        {Math.round(item.totalScore || 0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="dm-bottom-section">
        {totalPages > 1 && (
          <div className="dm-pagination">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(p => p - 1)}
              className="dm-page-btn"
            >
              <ChevronLeftIcon className="icon" />
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="dm-page-btn"
            >
              <ChevronRightIcon className="icon" />
            </button>
          </div>
        )}

        {totalSelectedCount > 0 && (
          <div className="dm-action-bar">
            <span>Đã chọn <strong>{totalSelectedCount}</strong> từ trên nhiều trang</span>
            <div className="dm-action-buttons">
              <button className="dm-btn-text" onClick={() => setSelectedWordsById({})}>
                Bỏ chọn tất cả
              </button>
              <button className="btn-primary" onClick={handlePracticeWriting}>
                Luyện viết
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .deck-mastery-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
        }

        .dm-header-actions {
          display: flex;
          justify-content: flex-end;
        }

        .dm-search-box {
          position: relative;
          width: 300px;
        }

        .dm-search-box .icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: var(--text-muted);
        }

        .dm-search-box input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-body);
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s;
        }

        .dm-search-box input:focus {
          border-color: var(--primary-color);
        }

        .dm-loading, .dm-error, .dm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
          color: var(--text-muted);
        }

        .dm-error {
          color: #EF4444;
        }

        .dm-error .icon {
          width: 40px;
          height: 40px;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid var(--border);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dm-table-container {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .dm-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .dm-table th, .dm-table td {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .dm-table th {
          background: var(--bg-body);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dm-table tbody tr {
          transition: background 0.2s;
        }

        .dm-table tbody tr:hover {
          background: var(--bg-body);
        }
        
        .dm-table tbody tr.selected-row {
          background: rgba(59, 130, 246, 0.05);
        }

        .dm-word-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .dm-word-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dm-word {
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .dm-speak-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .dm-speak-btn:hover:not(:disabled) {
          color: var(--primary-color);
          background: var(--bg-body);
        }
        
        .dm-speak-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .dm-speak-btn .icon {
          width: 18px;
          height: 18px;
        }

        .dm-pron {
          font-size: 13px;
          color: var(--text-muted);
        }

        .dm-meanings {
          color: var(--text-secondary);
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .dm-tier-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .dm-score {
          font-weight: 600;
          color: var(--text-primary);
        }

        .dm-bottom-section {
          position: sticky;
          bottom: -24px; /* padding offset */
          background: var(--bg-card);
          padding: 16px 0;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dm-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .dm-page-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dm-page-btn:hover:not(:disabled) {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }

        .dm-page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dm-page-btn .icon {
          width: 16px;
          height: 16px;
        }
        
        .dm-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--primary-color);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          animation: slideUp 0.3s ease-out;
        }
        
        .dm-action-buttons {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .dm-btn-text {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        
        .dm-btn-text:hover {
          color: white;
          text-decoration: underline;
        }
        
        .dm-action-bar .btn-primary {
          background: white;
          color: var(--primary-color);
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dm-action-bar .btn-primary:hover {
          background: #f8fafc;
          transform: translateY(-1px);
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
