import React from 'react'
import {
  TrashIcon,
  PlusIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChartBarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import './MasteryPage.css'

interface MasteryPageProps {
  masteryWords: any[]
  masteryLoading: boolean
  masteryPagination: { totalPages: number; page: number; totalItems: number }
  masteryTierSummary: any
  masteryTierFilter: string
  setMasteryTierFilter: (val: string) => void
  masterySkillFilter: string
  setMasterySkillFilter: (val: string) => void
  masterySearch: string
  setMasterySearch: (val: string) => void
  masterySort: string
  setMasterySort: (val: string) => void
  masteryPage: number
  setMasteryPage: (val: number) => void
  fetchMasteryWords: (tier?: string, search?: string, sort?: string, page?: number, skill?: string) => void
  adjustPoints: (wordId: string, skill: string, delta: number) => void
  clearWordProgress: (wordId: string) => void
  clearAllProgress: () => void
  clearingProgress: boolean
  seedDemoData: () => void
  seedingDemo: boolean
  showScoringOverview: boolean
  setShowScoringOverview: (val: boolean) => void
  getLevelColor: (level: string) => string
}

export default function MasteryPage({
  masteryWords,
  masteryLoading,
  masteryPagination,
  masteryTierSummary,
  masteryTierFilter,
  setMasteryTierFilter,
  masterySkillFilter,
  setMasterySkillFilter,
  masterySearch,
  setMasterySearch,
  masterySort,
  setMasterySort,
  masteryPage,
  setMasteryPage,
  fetchMasteryWords,
  adjustPoints,
  clearWordProgress,
  clearAllProgress,
  clearingProgress,
  seedDemoData,
  seedingDemo,
  showScoringOverview,
  setShowScoringOverview,
  getLevelColor
}: MasteryPageProps) {
  const avgSkills = React.useMemo(() => {
    if (!masteryWords || masteryWords.length === 0) return [
      { skill: 'Recall', current: 0, target: 80, fullMark: 100 },
      { skill: 'Listening', current: 0, target: 80, fullMark: 100 },
      { skill: 'Writing', current: 0, target: 80, fullMark: 100 },
      { skill: 'Pronun.', current: 0, target: 80, fullMark: 100 },
    ];
    let r = 0, l = 0, w = 0, p = 0;
    masteryWords.forEach(word => {
      r += word.skills?.recall || 0;
      l += word.skills?.listening || 0;
      w += word.skills?.writing || 0;
      p += word.skills?.pronunciation || 0;
    });
    const total = masteryWords.length;
    return [
      { skill: 'Recall', current: Math.round(r / total), target: 80, fullMark: 100 },
      { skill: 'Listening', current: Math.round(l / total), target: 80, fullMark: 100 },
      { skill: 'Writing', current: Math.round(w / total), target: 80, fullMark: 100 },
      { skill: 'Pronun.', current: Math.round(p / total), target: 80, fullMark: 100 },
    ];
  }, [masteryWords]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Độ thành thạo</h1>
          <p className="page-subtitle">Độ thành thạo từng từ vựng theo kỹ năng</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={clearAllProgress}
            disabled={clearingProgress}
            title="Xóa toàn bộ tiến độ"
          >
            {clearingProgress ? 'Đang xóa...' : <><TrashIcon className="icon icon-inline" /> Xóa tất cả</>}
          </button>
          <button className="btn-primary" onClick={seedDemoData} disabled={seedingDemo}>
            {seedingDemo ? 'Đang tạo...' : <><PlusIcon className="icon icon-inline" /> Tạo dữ liệu mẫu</>}
          </button>
        </div>
      </div>

      {/* Radar Chart */}
      {masteryWords.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontWeight: 600, fontSize: '18px' }}>Biểu đồ Kỹ năng Tổng quan (Spider Web)</h3>
            <InformationCircleIcon className="icon" style={{ color: 'var(--accent)', cursor: 'pointer', width: 24, height: 24 }} />
          </div>
          <div style={{ width: '100%', maxWidth: 500, height: 400, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={avgSkills}>
                <PolarGrid gridType="polygon" stroke="var(--border)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                />
                <Legend verticalAlign="top" align="left" iconType="square" wrapperStyle={{ paddingBottom: '20px' }} />
                <Radar 
                  name="Năng lực hiện tại" 
                  dataKey="current" 
                  stroke="#E11D48" 
                  strokeWidth={2}
                  fill="#E11D48" 
                  fillOpacity={0.1} 
                  activeDot={{ r: 6 }}
                  dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)', stroke: '#E11D48' }}
                />
                <Radar 
                  name="Năng lực cần đạt" 
                  dataKey="target" 
                  stroke="#1E3A8A" 
                  strokeWidth={2}
                  fill="#1E3A8A" 
                  fillOpacity={0.1} 
                  activeDot={{ r: 6 }}
                  dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)', stroke: '#1E3A8A' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Scoring Overview */}
      <div className="scoring-overview-card">
        <button
          className={`scoring-overview-toggle ${showScoringOverview ? 'open' : ''}`}
          onClick={() => setShowScoringOverview(!showScoringOverview)}
        >
          <div className="scoring-toggle-left">
            <InformationCircleIcon className="icon" />
            <span>Phương pháp tính điểm — Spaced Repetition Scoring</span>
          </div>
          <ChevronDownIcon className={`icon scoring-chevron ${showScoringOverview ? 'rotated' : ''}`} />
        </button>

        <div className={`scoring-overview-body ${showScoringOverview ? 'expanded' : ''}`}>
          <div className="scoring-overview-content">
            <div className="scoring-intro">
              <p>
                Hệ thống sử dụng <strong>Spaced Repetition</strong> (Lặp lại ngắt quãng). Từ vựng sẽ bị trừ điểm mỗi ngày nếu không ôn tập.
                Xem chi tiết decay rate ở bảng dưới.
              </p>
            </div>
            <div className="scoring-grid">
              <div className="scoring-section">
                <div className="scoring-section-header">
                  <ChartBarIcon className="icon" />
                  <h4>Hệ thống điểm (0 — 100)</h4>
                </div>
                <div className="scoring-formula">
                  <div className="formula-row">
                    <span className="formula-icon correct">✓</span>
                    <span>Trả lời đúng: <strong>+15 điểm</strong></span>
                  </div>
                  <div className="formula-row">
                    <span className="formula-icon wrong">✗</span>
                    <span>Trả lời sai: <strong>−10 điểm</strong></span>
                  </div>
                  <div className="formula-row">
                    <span className="formula-icon streak">🔥</span>
                    <span>Streak bonus: <strong>+5</strong> khi đúng 3+ lần liên tiếp</span>
                  </div>
                </div>
              </div>
              <div className="scoring-section">
                <div className="scoring-section-header">
                  <TrophyIcon className="icon" />
                  <h4>Decay Rate theo cấp độ</h4>
                </div>
                <div className="scoring-tiers-list">
                  <div className="scoring-tier-item">
                    <div className="tier-indicator" style={{ background: '#22C55E' }} />
                    <div className="tier-info">
                      <strong>Mastered (80–100)</strong>
                      <span className="tier-decay-rate tier-decay-low">🔻 −2 điểm/ngày</span>
                    </div>
                  </div>
                  <div className="scoring-tier-item">
                    <div className="tier-indicator" style={{ background: '#3B82F6' }} />
                    <div className="tier-info">
                      <strong>Familiar (40–79)</strong>
                      <span className="tier-decay-rate tier-decay-med">🔻 −4 điểm/ngày</span>
                    </div>
                  </div>
                  <div className="scoring-tier-item">
                    <div className="tier-indicator" style={{ background: '#F59E0B' }} />
                    <div className="tier-info">
                      <strong>Learning (1–39)</strong>
                      <span className="tier-decay-rate tier-decay-high">🔻 −5 điểm/ngày</span>
                    </div>
                  </div>
                  <div className="scoring-tier-item">
                    <div className="tier-indicator" style={{ background: 'var(--text-muted)' }} />
                    <div className="tier-info">
                      <strong>Not Started (0)</strong>
                      <span className="tier-decay-rate tier-decay-none">Không bị trừ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Filter Chips */}
      <div className="mastery-filters">
        <div className="mastery-filter-row">
          <div className="mastery-search-box">
            <MagnifyingGlassIcon className="icon" />
            <input
              type="text"
              placeholder="Tìm từ vựng..."
              value={masterySearch}
              onChange={(e) => {
                setMasterySearch(e.target.value)
                setMasteryPage(1)
                fetchMasteryWords(masteryTierFilter, e.target.value, masterySort, 1)
              }}
            />
          </div>
          <div className="mastery-tier-chips">
            {[
              { key: 'all', label: `Tất cả (${masteryTierSummary?.total || 0})`, color: 'var(--accent)' },
              { key: 'mastered', label: `🌳 Thành thạo (${masteryTierSummary?.mastered || 0})`, color: '#22C55E' },
              { key: 'familiar', label: `🌿 Quen thuộc (${masteryTierSummary?.familiar || 0})`, color: '#3B82F6' },
              { key: 'learning', label: `🌱 Đang học (${masteryTierSummary?.learning || 0})`, color: '#F59E0B' },
              { key: 'not_started', label: `🌰 Chưa bắt đầu (${masteryTierSummary?.not_started || 0})`, color: 'var(--text-muted)' },
            ].map(chip => (
              <button
                key={chip.key}
                className={`mastery-chip ${masteryTierFilter === chip.key ? 'active' : ''}`}
                style={masteryTierFilter === chip.key ? { borderColor: chip.color, background: chip.color + '18' } : {}}
                onClick={() => {
                  setMasteryTierFilter(chip.key)
                  setMasteryPage(1)
                  fetchMasteryWords(chip.key, masterySearch, masterySort, 1)
                }}
              >
                <span className="chip-dot" style={{ background: chip.color }} />
                {chip.label}
              </button>
            ))}
          </div>
          <select
            className="mastery-skill-select"
            value={masterySkillFilter}
            onChange={(e) => {
              setMasterySkillFilter(e.target.value)
              setMasteryPage(1)
              fetchMasteryWords(masteryTierFilter, masterySearch, masterySort, 1, e.target.value)
            }}
          >
            <option value="all">🎯 All Skills</option>
            <option value="recall">🧠 Recall</option>
            <option value="writing">✍️ Writing</option>
            <option value="pronunciation">🔊 Pronunciation</option>
          </select>
          <select
            className="mastery-sort-select"
            value={masterySort}
            onChange={(e) => {
              setMasterySort(e.target.value)
              setMasteryPage(1)
              fetchMasteryWords(masteryTierFilter, masterySearch, e.target.value, 1)
            }}
          >
            <option value="overall_desc">Overall ↓</option>
            <option value="overall_asc">Overall ↑</option>
            <option value="word_asc">A → Z</option>
            <option value="word_desc">Z → A</option>
            <option value="recall_desc">Recall ↓</option>
            <option value="listening_desc">Listening ↓</option>
            <option value="writing_desc">Writing ↓</option>
            <option value="pronunciation_desc">Pronunciation ↓</option>
          </select>
          {(masterySearch || masteryTierFilter !== 'all' || masterySkillFilter !== 'all' || masterySort !== 'overall_desc') && (
            <button
              className="mastery-clear-filter-btn"
              onClick={() => {
                setMasterySearch('')
                setMasteryTierFilter('all')
                setMasterySkillFilter('all')
                setMasterySort('overall_desc')
                setMasteryPage(1)
                fetchMasteryWords('all', '', 'overall_desc', 1, 'all')
              }}
              title="Xóa bộ lọc"
            >
              <XMarkIcon className="icon" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Word Proficiency Table */}
      {masteryLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : masteryWords.length > 0 ? (
        <div className="card mastery-table-card">
          <div className="mastery-table-wrapper">
            <table className="mastery-table">
              <thead>
                <tr>
                  <th className="col-word">Từ vựng</th>
                  <th className="col-level">Level</th>
                  <th className="col-skill">Recall</th>
                  <th className="col-skill">Listening</th>
                  <th className="col-skill">Writing</th>
                  <th className="col-skill">Pronunciation</th>
                  <th className="col-overall">Overall</th>
                  <th className="col-status">Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {masteryWords.map((w) => {
                  const tierConfig: Record<string, { label: string; color: string; bg: string }> = {
                    mastered: { label: '🌳 Mastered', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
                    familiar: { label: '🌿 Familiar', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                    learning: { label: '🌱 Learning', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                    not_started: { label: '🌰 Not Started', color: 'var(--text-muted)', bg: 'var(--bg-input)' },
                  }
                  const tc = tierConfig[w.tier] || tierConfig.not_started
                  const skillColor = (pts: number) => pts >= 80 ? '#22C55E' : pts >= 40 ? '#3B82F6' : pts > 0 ? '#F59E0B' : 'var(--text-muted)'

                  return (
                    <tr key={w.wordId} className={w.isDecaying ? 'row-decaying' : ''}>
                      <td className="col-word">
                        <div className="mastery-word-cell">
                          <span className="mastery-word-name">{w.word}</span>
                          {w.pronunciation && <span className="mastery-word-pron">{w.pronunciation}</span>}
                        </div>
                      </td>
                      <td className="col-level">
                        <span className="badge badge-level" style={{ backgroundColor: getLevelColor(w.level), fontSize: '10px', padding: '2px 6px' }}>
                          {w.level}
                        </span>
                      </td>
                      {(['recall', 'listening', 'writing', 'pronunciation'] as const).map(skill => (
                        <td key={skill} className="col-skill">
                          <div className="mastery-skill-cell">
                            <div className="mastery-skill-bar">
                              <div className="mastery-skill-fill" style={{ width: `${w.skills[skill]}%`, background: skillColor(w.skills[skill]) }} />
                            </div>
                            <span className="mastery-skill-val" style={{ color: skillColor(w.skills[skill]) }}>{w.skills[skill]}</span>
                            <div className="mastery-adjust-btns">
                              <button title="+10" onClick={() => adjustPoints(w.wordId, skill, 10)} className="adj-btn adj-up">+</button>
                              <button title="-10" onClick={() => adjustPoints(w.wordId, skill, -10)} className="adj-btn adj-down">−</button>
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className="col-overall">
                        <span className="mastery-overall-val" style={{ color: skillColor(w.overall) }}>{w.overall}</span>
                      </td>
                      <td className="col-status">
                        <span className="mastery-tier-badge" style={{ color: tc.color, background: tc.bg, borderColor: tc.color + '33' }}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="col-actions">
                        <button
                          className="mastery-clear-btn"
                          title="Xóa tiến độ từ này"
                          onClick={() => clearWordProgress(w.wordId)}
                        >
                          <TrashIcon className="icon" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {masteryPagination.totalPages > 1 && (
            <div className="mastery-pagination">
              <button
                disabled={masteryPage <= 1}
                onClick={() => { setMasteryPage(masteryPage - 1); fetchMasteryWords(undefined, undefined, undefined, masteryPage - 1) }}
                className="mastery-page-btn"
              >
                <ChevronLeftIcon className="icon" />
              </button>
              <span className="mastery-page-info">
                Trang {masteryPagination.page} / {masteryPagination.totalPages}
                <span className="mastery-page-total"> ({masteryPagination.totalItems} từ)</span>
              </span>
              <button
                disabled={masteryPage >= masteryPagination.totalPages}
                onClick={() => { setMasteryPage(masteryPage + 1); fetchMasteryWords(undefined, undefined, undefined, masteryPage + 1) }}
                className="mastery-page-btn"
              >
                <ChevronRightIcon className="icon" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="proficiency-empty">
          <TrophyIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
          <p>Chưa có dữ liệu.</p>
          <p className="text-muted" style={{ fontSize: 13 }}>Tạo demo data hoặc bắt đầu học để xem độ thành thạo.</p>
        </div>
      )}
    </>
  )
}
