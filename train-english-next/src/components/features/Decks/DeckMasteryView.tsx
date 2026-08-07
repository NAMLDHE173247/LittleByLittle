"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/AuthContext";
import { useGlobalData } from "@/components/providers/GlobalDataProvider";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";

type Tier = "not_started" | "learning" | "familiar" | "mastered";
type SkillKey = "recall" | "listening" | "writing" | "pronunciation";

interface ProgressWordItem {
  wordId: string;
  word: string;
  pronunciation?: string;
  meanings?: string[];
  overall: number | string | null;
  tier: Tier | string;
  skills?: Partial<Record<SkillKey, number | string | null>>;
}

interface TierSummary {
  mastered: number;
  familiar: number;
  learning: number;
  not_started: number;
  total: number;
}

interface Pagination {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

interface DeckInfo {
  name?: string;
  description?: string;
  color?: string;
  wordCount?: number;
}

interface DeckMasteryViewProps {
  deckId: string;
  deck?: DeckInfo | null;
}

const DEBOUNCE_DELAY = 400;
const PAGE_LIMIT = 20;

const TIER_CONFIG: Record<Tier | "unknown", { label: string; color: string }> = {
  not_started: { label: "Chưa học", color: "#94a3b8" },
  learning: { label: "Đang học", color: "#eab308" },
  familiar: { label: "Đã quen", color: "#3b82f6" },
  mastered: { label: "Thành thạo", color: "#22c55e" },
  unknown: { label: "Chưa xác định", color: "#f97316" },
};

const SUMMARY_ORDER: Array<{ key: Tier; shortLabel: string }> = [
  { key: "mastered", shortLabel: "Thành thạo" },
  { key: "familiar", shortLabel: "Đã quen" },
  { key: "learning", shortLabel: "Đang học" },
  { key: "not_started", shortLabel: "Chưa học" },
];

const RECALL_COLOR = "#3b82f6";

function clampScore(value: number | string | null | undefined) {
  const score = Math.round(Number(value ?? 0));
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

function getTierConfig(tier: string) {
  return TIER_CONFIG[tier as Tier] ?? TIER_CONFIG.unknown;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
}

export default function DeckMasteryView({ deckId, deck }: DeckMasteryViewProps) {
  const { authHeaders } = useAuth();
  const { speak } = useGlobalData();

  const [data, setData] = useState<ProgressWordItem[]>([]);
  const [tierSummary, setTierSummary] = useState<TierSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: PAGE_LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (deckId !== "all") {
        params.set("deckId", deckId);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/progress/words?${params}`, {
        headers: authHeaders(),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải dữ liệu.");
      }

      if (!Array.isArray(json.data?.words)) {
        throw new Error("Response /api/progress/words không có field data.words hợp lệ.");
      }

      const nextPagination: Pagination = {
        page: Number(json.data.pagination?.page ?? page),
        totalPages: Number(json.data.pagination?.totalPages ?? 1),
        totalItems: Number(json.data.pagination?.totalItems ?? json.data.words.length),
        limit: Number(json.data.pagination?.limit ?? PAGE_LIMIT),
      };

      setData(json.data.words);
      setPagination(nextPagination);
      setTierSummary(json.data.tierSummary ?? null);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, deckId, debouncedSearch, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchData]);

  const summaryTotal = tierSummary
    ? tierSummary.mastered + tierSummary.familiar + tierSummary.learning + tierSummary.not_started
    : 0;
  const shouldShowTierSummary = !!tierSummary && summaryTotal === tierSummary.total && summaryTotal === pagination.totalItems;
  const summaryLabel = debouncedSearch ? "Tổng quan kết quả tìm kiếm" : "Tổng quan deck";

  const handleSpeak = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (word) speak(word);
  };

  const renderScore = (item: ProgressWordItem) => {
    const recallScore = item.skills?.recall;
    const hasRecallScore = recallScore !== null && recallScore !== undefined;
    const safeRecallScore = hasRecallScore ? clampScore(recallScore) : null;

    return (
      <div className="dm-recall-cell" aria-label={`Recall của từ ${item.word || ""}`}>
        {hasRecallScore ? (
          <div className="dm-recall-row">
            <span className="dm-recall-label">Recall</span>
            <div
              className="dm-recall-bar-wrap"
              role="progressbar"
              aria-label={`Recall của từ ${item.word || ""}`}
              aria-valuenow={safeRecallScore ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="dm-recall-bar"
                style={{ width: `${safeRecallScore}%`, backgroundColor: RECALL_COLOR }}
              />
            </div>
            <span className="dm-recall-val">{safeRecallScore}</span>
          </div>
        ) : (
          <span className="dm-recall-empty">Chưa có dữ liệu Recall</span>
        )}
      </div>
    );
  };

  return (
    <div className="deck-mastery-view">
      <div className="dm-panel-header">
        <div>
          <p className="dm-eyebrow">Tiến độ từ vựng</p>
          <h2>{deck?.name ? `Danh sách trong ${deck.name}` : "Danh sách từ vựng"}</h2>
          <p className="dm-subtitle">
            {debouncedSearch
              ? `${pagination.totalItems} kết quả phù hợp`
              : `${deck?.wordCount ?? pagination.totalItems} từ trong deck`}
          </p>
        </div>

        <div className="dm-search-box">
          <MagnifyingGlassIcon className="icon" />
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm từ vựng trong deck"
          />
        </div>
      </div>

      {shouldShowTierSummary && tierSummary && (
        <section
          className="dm-summary"
          aria-label={summaryLabel}
          title={summaryLabel}
        >
          <div className="dm-summary-heading">
            <span>{summaryLabel}</span>
            <strong>{tierSummary.total} từ</strong>
          </div>
          <div className="dm-summary-grid">
            {SUMMARY_ORDER.map(({ key, shortLabel }) => {
              const tierConfig = getTierConfig(key);
              return (
                <div className="dm-summary-item" key={key}>
                  <span className="dm-summary-dot" style={{ background: tierConfig.color }} />
                  <span>{shortLabel}</span>
                  <strong>{tierSummary[key]}</strong>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="dm-header-actions">
        <p className="dm-results-note">
          Hiển thị <strong>{data.length}</strong> / <strong>{pagination.totalItems}</strong> từ
        </p>
        {pagination.totalPages > 1 && (
          <div className="dm-pagination" aria-label="Phân trang danh sách từ vựng">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="dm-page-btn"
              aria-label="Trang trước"
            >
              <ChevronLeftIcon className="icon" />
            </button>
            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="dm-page-btn"
              aria-label="Trang sau"
            >
              <ChevronRightIcon className="icon" />
            </button>
          </div>
        )}
      </div>

      {loading && data.length === 0 ? (
        <div className="dm-skeleton" aria-label="Đang tải dữ liệu">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="dm-skeleton-row" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="dm-error">
          <ExclamationTriangleIcon className="icon" />
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchData}>
            Thử lại
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="dm-empty">
          <p>{debouncedSearch ? "Không tìm thấy từ phù hợp." : "Deck này chưa có từ vựng."}</p>
        </div>
      ) : (
        <div className="dm-table-container">
          <table className="dm-table">
            <thead>
              <tr>
                <th>Từ vựng</th>
                <th>Nghĩa</th>
                <th>Thông thạo tổng thể</th>
                <th>Recall</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const hasMeanings = Array.isArray(item.meanings) && item.meanings.length > 0;
                const tierConfig = getTierConfig(item.tier);

                return (
                  <tr key={item.wordId}>
                    <td>
                      <div className="dm-word-col">
                        <div className="dm-word-row">
                          <span className="dm-word">{item.word}</span>
                          <button
                            className="dm-speak-btn"
                            onClick={(e) => handleSpeak(e, item.word)}
                            disabled={!item.word}
                            aria-label={`Phát âm từ ${item.word || ""}`}
                            title="Phát âm"
                          >
                            <SpeakerWaveIcon className="icon" />
                          </button>
                        </div>
                        {item.pronunciation ? <span className="dm-pron">/{item.pronunciation}/</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className={hasMeanings ? "dm-meanings" : "dm-meanings dm-muted"}>
                        {hasMeanings 
                          ? item.meanings!.map((m, idx) => (
                              <span key={idx} className="dm-meaning-chip">{m.trim()}</span>
                            ))
                          : "Chưa có nghĩa"}
                      </div>
                    </td>
                    <td>
                      <div className="dm-tier-overall-wrap">
                        <span
                          className="dm-tier-badge"
                          style={{
                            backgroundColor: `${tierConfig.color}18`,
                            color: tierConfig.color,
                            border: `1px solid ${tierConfig.color}40`,
                          }}
                        >
                          {tierConfig.label}
                        </span>
                        <span className="dm-overall-score" style={{ color: tierConfig.color }}>
                          • {item.overall ?? 0}
                        </span>
                      </div>
                    </td>
                    <td>{renderScore(item)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .deck-mastery-view {
          display: flex;
          flex-direction: column;
          gap: 18px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
        }

        .dm-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .dm-eyebrow {
          margin: 0 0 4px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .dm-panel-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 20px;
          line-height: 1.25;
        }

        .dm-subtitle,
        .dm-results-note {
          margin: 6px 0 0;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .dm-search-box {
          position: relative;
          width: min(320px, 100%);
          flex: 0 0 320px;
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

        .dm-summary {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          background: var(--bg-body);
        }

        .dm-summary-heading,
        .dm-summary-item,
        .dm-header-actions,
        .dm-pagination,
        .dm-word-row,
        .dm-recall-row {
          display: flex;
          align-items: center;
        }

        .dm-summary-heading {
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .dm-summary-heading strong {
          color: var(--text-primary);
        }

        .dm-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .dm-summary-item {
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px;
          background: var(--bg-card);
        }

        .dm-summary-item strong {
          color: var(--text-primary);
        }

        .dm-summary-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: 0 0 auto;
        }

        .dm-header-actions {
          justify-content: space-between;
          gap: 16px;
        }

        .dm-loading,
        .dm-error,
        .dm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 56px 20px;
          gap: 16px;
          color: var(--text-muted);
        }

        .dm-error {
          color: #ef4444;
        }

        .dm-error .icon {
          width: 40px;
          height: 40px;
        }

        .dm-skeleton {
          display: grid;
          gap: 10px;
        }

        .dm-skeleton-row {
          height: 64px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--bg-body), var(--border), var(--bg-body));
          background-size: 200% 100%;
          animation: shimmer 1.2s linear infinite;
        }

        @keyframes shimmer {
          to {
            background-position-x: -200%;
          }
        }

        .dm-table-container {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .dm-table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
          text-align: left;
        }

        .dm-table th,
        .dm-table td {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        .dm-table th {
          background: var(--bg-body);
          font-weight: 700;
          color: var(--text-secondary);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--border);
        }

        .dm-table tbody tr {
          transition: background 0.2s ease;
        }

        .dm-table tbody tr:hover {
          background: var(--bg-body);
        }

        .dm-word-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dm-word-row {
          gap: 8px;
        }

        .dm-word {
          font-weight: 700;
          color: var(--text-primary);
        }

        .dm-speak-btn {
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
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
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .dm-meaning-chip {
          background: var(--bg-body);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .dm-muted {
          color: var(--text-muted);
          font-style: italic;
          padding: 4px 0;
          font-size: 14px;
        }

        .dm-tier-overall-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dm-overall-score {
          font-size: 14px;
          font-weight: 700;
          opacity: 0.9;
        }

        .dm-tier-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }

        .dm-recall-cell {
          width: min(100%, 300px);
        }

        .dm-recall-row {
          display: grid;
          grid-template-columns: 52px minmax(110px, 1fr) 36px;
          align-items: center;
          gap: 10px;
          padding: 6px 8px;
          border-radius: 8px;
          background-color: rgba(59, 130, 246, 0.08);
        }

        .dm-recall-label {
          color: #3b82f6;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .dm-recall-bar-wrap {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background-color: var(--border);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }

        .dm-recall-bar {
          height: 100%;
          min-width: 3px;
          border-radius: inherit;
          background-image: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0));
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dm-recall-val {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          text-align: right;
        }

        .dm-recall-empty {
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
        }

        .dm-pagination {
          justify-content: center;
          gap: 12px;
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

        @media (max-width: 760px) {
          .deck-mastery-view {
            padding: 16px;
          }

          .dm-panel-header,
          .dm-header-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .dm-search-box {
            width: 100%;
            flex: none;
          }

          .dm-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dm-results-note {
            margin-top: 0;
          }
        }
      `}</style>
    </div>
  );
}
