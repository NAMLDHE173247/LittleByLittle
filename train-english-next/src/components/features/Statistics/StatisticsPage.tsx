import React from 'react'
import {
  ArrowTrendingDownIcon,
  TrophyIcon,
  EyeIcon,
  SpeakerWaveIcon,
  PencilSquareIcon,
  BookOpenIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import type { ProgressData } from '../../../types'
import './StatisticsPage.css'

interface StatisticsPageProps {
  progressData: ProgressData | null
  progressLoading: boolean
  seedingDemo: boolean
  seedDemoData: () => void
  getLevelColor: (level: string) => string
}



export default function StatisticsPage({
  progressData,
  progressLoading,
  seedingDemo,
  seedDemoData,
  getLevelColor,
}: StatisticsPageProps) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Thống kê</h1>
          <p className="page-subtitle">Thống kê tổng quan về Recall, Listening, Writing & Pronunciation</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={seedDemoData} disabled={seedingDemo}>
            {seedingDemo ? (
              <><span className="spinner-sm"></span> Đang tạo...</>
            ) : (
              <><PlusIcon className="icon icon-inline" /> Tạo dữ liệu mẫu</>
            )}
          </button>
        </div>
      </div>

      {progressLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
            <p>Đang tải dữ liệu...</p>
        </div>
      ) : progressData ? (
        <>
        <div className="card" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '8px', fontWeight: 600, fontSize: '18px' }}>Mức độ chăm chỉ (30 ngày qua)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>🚧 Đang phát triển</p>
        </div>
        {/* Decay Alert Banner removed — decay is now calculated in real-time */}

        {/* Overall Proficiency */}
        <div className="proficiency-overview">
          <div className="proficiency-overall-card">
            <div className="overall-ring-container">
              <svg className="overall-ring" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="overallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818CF8" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
                <circle className="ring-bg" cx="80" cy="80" r="70" />
                <circle
                  className="ring-progress ring-animate"
                  cx="80" cy="80" r="70"
                  stroke="url(#overallGrad)"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressData.overallPercent / 100)}`}
                />
              </svg>
              <div className="overall-ring-label">
                <span className="overall-percent">{progressData.overallPercent}%</span>
                <span className="overall-text">Tổng quan</span>
              </div>
            </div>
            <div className="overall-info">
              <h3>Độ thành thạo tổng</h3>
              <p className="overall-desc">Tổng hợp mức thành thạo các kỹ năng và từ vựng</p>
              <div className="overall-meta">
                <div className="overall-meta-item">
                  <span className="meta-value">{progressData.totalWords}</span>
                  <span className="meta-label">Tổng số từ</span>
                </div>
                <div className="overall-meta-item">
                  <span className="meta-value">{progressData.totalWordsWithProgress}</span>
                  <span className="meta-label">Đã học</span>
                </div>
                <div className="overall-meta-item">
                  <span className="meta-value">
                    {progressData.skills.reduce((s: any, sk: any) => s + sk.dueForReview, 0)}
                  </span>
                  <span className="meta-label">Cần ôn tập</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decay Breakdown Card removed — decay is now calculated in real-time */}

        {/* Per-Skill Cards */}
        <div className="proficiency-skills-grid">
          {progressData.skills.map((sk: any) => {
            const skillConfig: Record<string, { color: string; gradient: string; icon: React.ReactNode; label: string }> = {
              recall: {
                color: '#3B82F6',
                gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                icon: <EyeIcon className="icon" />,
                label: 'Nhớ lại (Recall)',
              },
              listening: {
                color: '#10B981',
                gradient: 'linear-gradient(135deg, #10B981, #059669)',
                icon: <SpeakerWaveIcon className="icon" />,
                label: 'Nghe hiểu',
              },
              writing: {
                color: '#8B5CF6',
                gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                icon: <PencilSquareIcon className="icon" />,
                label: 'Viết',
              },
              pronunciation: {
                color: '#F59E0B',
                gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
                icon: <SpeakerWaveIcon className="icon" />,
                label: 'Phát âm',
              },
            }
            const cfg = skillConfig[sk.skill]
            const circumference = 2 * Math.PI * 54
            const offset = circumference * (1 - sk.proficiencyPercent / 100)

            return (
              <div key={sk.skill} className="skill-proficiency-card">
                <div className="skill-card-top">
                  <div className="skill-ring-container">
                    <svg className="skill-ring" viewBox="0 0 120 120">
                      <circle className="ring-bg" cx="60" cy="60" r="54" />
                      <circle
                        className="ring-progress ring-animate"
                        cx="60" cy="60" r="54"
                        stroke={cfg.color}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="skill-ring-label">
                      <span className="skill-percent" style={{ color: cfg.color }}>
                        {sk.proficiencyPercent}%
                      </span>
                    </div>
                  </div>
                  <div className="skill-card-info">
                    <div className="skill-name-row">
                      <span className="skill-icon-circle" style={{ background: cfg.gradient }}>
                        {cfg.icon}
                      </span>
                      <h3 className="skill-name">{cfg.label}</h3>
                    </div>
                    <p className="skill-subtitle">
                      {sk.wordsStarted} / {sk.wordsStarted + sk.notStarted} từ đã bắt đầu
                    </p>
                    {sk.dueForReview > 0 && (
                      <span className="skill-due-badge">
                        {sk.dueForReview} cần ôn tập
                      </span>
                    )}
                  </div>
                </div>

                {/* Tier Breakdown */}
                <div className="skill-tiers">
                  <div className="tier-row">
                    <div className="tier-dot" style={{ background: '#22C55E' }} />
                    <span className="tier-label">Thành thạo</span>
                    <span className="tier-bar-container">
                      <span
                        className="tier-bar tier-bar-animate"
                        style={{
                          width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.mastered / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                          background: '#22C55E',
                        }}
                      />
                    </span>
                    <span className="tier-count">{sk.mastered}</span>
                  </div>
                  <div className="tier-row">
                    <div className="tier-dot" style={{ background: '#3B82F6' }} />
                    <span className="tier-label">Quen thuộc</span>
                    <span className="tier-bar-container">
                      <span
                        className="tier-bar tier-bar-animate"
                        style={{
                          width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.familiar / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                          background: '#3B82F6',
                        }}
                      />
                    </span>
                    <span className="tier-count">{sk.familiar}</span>
                  </div>
                  <div className="tier-row">
                    <div className="tier-dot" style={{ background: '#F59E0B' }} />
                    <span className="tier-label">Đang học</span>
                    <span className="tier-bar-container">
                      <span
                        className="tier-bar tier-bar-animate"
                        style={{
                          width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.learning / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                          background: '#F59E0B',
                        }}
                      />
                    </span>
                    <span className="tier-count">{sk.learning}</span>
                  </div>
                  <div className="tier-row">
                    <div className="tier-dot" style={{ background: 'var(--text-muted)' }} />
                    <span className="tier-label">Chưa bắt đầu</span>
                    <span className="tier-bar-container">
                      <span
                        className="tier-bar tier-bar-animate"
                        style={{
                          width: `${(sk.wordsStarted + sk.notStarted) > 0 ? (sk.notStarted / (sk.wordsStarted + sk.notStarted)) * 100 : 0}%`,
                          background: 'var(--text-muted)',
                        }}
                      />
                    </span>
                    <span className="tier-count">{sk.notStarted}</span>
                  </div>
                </div>

                <div className="skill-avg">
                  <TrophyIcon className="icon icon-inline" style={{ color: cfg.color }} />
                  Điểm TB: <strong>{sk.avgPoints}</strong> / 100
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Activity */}
        {progressData.recentActivity.length > 0 && (
          <div className="card proficiency-recent-card">
            <div className="proficiency-recent-header">
              <h3><BookOpenIcon className="icon icon-inline" /> Hoạt động gần đây</h3>
            </div>
            <div className="proficiency-recent-list">
              {progressData.recentActivity.map((act: any, idx: any) => (
                <div key={idx} className={`recent-activity-row ${act.isDecaying ? 'decaying' : ''}`}>
                  <div className="recent-word-info">
                    <span className="recent-word">{act.word}</span>
                    {act.pronunciation && <span className="recent-pron">{act.pronunciation}</span>}
                    <span
                      className="badge badge-level"
                      style={{ backgroundColor: getLevelColor(act.level), fontSize: '10px', padding: '1px 6px' }}
                    >
                      {act.level}
                    </span>
                    {act.isDecaying && (
                      <span className="badge badge-decaying">
                        <ArrowTrendingDownIcon className="icon" /> Đang giảm
                      </span>
                    )}
                  </div>
                  <div className="recent-skill-bars">
                    <div className="mini-skill" title={`Reading: ${act.skills.recall}`}>
                      <span className="mini-skill-label">R</span>
                      <span className="mini-skill-track">
                        <span className="mini-skill-fill" style={{ width: `${act.skills.recall}%`, background: '#3B82F6' }} />
                      </span>
                      <span className="mini-skill-val">{act.skills.recall}</span>
                    </div>
                    <div className="mini-skill" title={`Writing: ${act.skills.writing}`}>
                      <span className="mini-skill-label">W</span>
                      <span className="mini-skill-track">
                        <span className="mini-skill-fill" style={{ width: `${act.skills.writing}%`, background: '#8B5CF6' }} />
                      </span>
                      <span className="mini-skill-val">{act.skills.writing}</span>
                    </div>
                    <div className="mini-skill" title={`Pronunciation: ${act.skills.pronunciation}`}>
                      <span className="mini-skill-label">P</span>
                      <span className="mini-skill-track">
                        <span className="mini-skill-fill" style={{ width: `${act.skills.pronunciation}%`, background: '#F59E0B' }} />
                      </span>
                      <span className="mini-skill-val">{act.skills.pronunciation}</span>
                    </div>
                  </div>
                  <span className="recent-time">
                    {new Date(act.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      ) : (
        <div className="proficiency-empty">
          <TrophyIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
          <p>Chưa có dữ liệu.</p>
          <p className="text-muted" style={{ fontSize: 13 }}>Bắt đầu học hoặc tạo dữ liệu mẫu để xem thống kê.</p>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={seedDemoData} disabled={seedingDemo}>
            {seedingDemo ? 'Đang tạo...' : 'Tạo dữ liệu mẫu'}
          </button>
        </div>
      )}
    </>
  )
}
