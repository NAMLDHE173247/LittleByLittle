"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrophyIcon,
  CalendarDaysIcon,
  BoltIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  LifebuoyIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import { DailyActivityData } from '../Statistics/HeatmapChart';
import './StreakMomentumPage.css';

type Mode = '7' | '30';

const DAY_NAMES_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_NAMES_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const ZONE_H = 150; // px per half (positive/negative)

interface DayData {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  momentum: number;
  isToday: boolean;
  metGoal: boolean;
}

function buildDays(data: DailyActivityData[], count: number, goal: number): DayData[] {
  const result: DayData[] = [];
  const today = new Date();
  let m = 0;

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString('en-CA');
    const match = data.find((x) => x.dateString === dateStr);
    const reviews = match?.totalReviews ?? 0;
    const met = reviews >= goal;

    if (met) {
      // Gain: surplus capped at 2× goal so one great day doesn't dominate
      m += Math.min(reviews - goal, goal * 2);
    } else {
      // Decay: each missed day costs 70% of goal
      m -= Math.round(goal * 0.7);
      // Floor: don't go more negative than 2 months of missing
      m = Math.max(m, -goal * 60);
    }

    result.push({
      date: dateStr,
      label: i === 0 ? 'Hôm nay' : DAY_NAMES_SHORT[d.getDay()],
      fullLabel: `${DAY_NAMES_FULL[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
      count: reviews,
      momentum: m,
      isToday: i === 0,
      metGoal: met,
    });
  }

  return result;
}

interface Availability {
  total: number;
  due: number;
  notStarted: number;
  learning: number;
  started?: number;
}

interface Props {
  data: DailyActivityData[];
  dailyGoal?: number;
  availability?: Availability | null;
}

// Học từ mới: tối đa 5 từ mỗi lần (10 từ/lần là quá tải)
const NEW_WORD_LIMIT = 4;

export default function StreakMomentumPage({ data, dailyGoal = 10, availability = null }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('30');
  const [animKey, setAnimKey] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const days = useMemo(
    () => buildDays(data, parseInt(mode), dailyGoal),
    [data, mode, dailyGoal],
  );

  const maxAbs = useMemo(
    () => Math.max(1, ...days.map((d) => Math.abs(d.momentum))),
    [days],
  );

  const currentStreak = useMemo(() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].metGoal) s++;
      else break;
    }
    return s;
  }, [days]);

  const bestStreak = useMemo(() => {
    let best = 0, cur = 0;
    for (const d of days) {
      if (d.metGoal) { cur++; best = Math.max(best, cur); }
      else cur = 0;
    }
    return best;
  }, [days]);

  const goalDays = days.filter((d) => d.metGoal).length;
  const todayMomentum = days[days.length - 1]?.momentum ?? 0;
  const isPositiveTrend = todayMomentum >= 0;
  const hovered = hoveredIdx !== null ? days[hoveredIdx] : null;

  // ─── Smart shortcuts: số lượng từ gợi ý, cap theo kho từ thực tế ───
  const debt = Math.max(0, -todayMomentum);
  const isNegative = todayMomentum < 0;

  // Pool khả dụng (null = chưa tải xong → không cap, để API tự xử lý)
  const due = availability?.due ?? null;
  const newPool = availability?.notStarted ?? null;
  const total = availability?.total ?? null;
  const started = availability?.started ?? (total !== null && newPool !== null ? total - newPool : null);

  // Cap theo từ đã học (started), KHÔNG cap theo due — due chỉ 1 từ vẫn có thể ôn thêm từ điểm thấp
  const capToPool = (ideal: number) =>
    started === null ? ideal : Math.min(ideal, Math.max(0, started));

  const maintain = { count: capToPool(dailyGoal), preset: 'maintain' as const };
  const recovery = { count: capToPool(Math.min(50, Math.max(1, Math.round(debt)))), preset: 'recovery' as const };

  // Học từ mới: tối đa NEW_WORD_LIMIT, cap theo số từ chưa học
  const boostCount = newPool === null
    ? NEW_WORD_LIMIT
    : Math.min(NEW_WORD_LIMIT, newPool);

  const maintainDisabled = started !== null && started === 0;
  const recoveryDisabled = started !== null && started === 0;
  const boostDisabled = newPool !== null && newPool === 0;

  const goPractice = (count: number, preset: 'maintain' | 'recovery' | 'new') => {
    if (count < 1) return;
    router.push(`/practice?preset=${preset}&count=${count}&src=streak`);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setAnimKey((k) => k + 1);
    setHoveredIdx(null);
  };

  // In 30-day mode, only show label every 5 days + last day
  const showLabel = (i: number) =>
    mode === '7' || i === 0 || i % 5 === 0 || i === days.length - 1;

  return (
    <div className="smp">
      {/* ─── Page header ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nhật ký Streak</h1>
          <p className="page-subtitle">
            Theo dõi chuỗi học của bạn theo kiểu chứng khoán — giữ streak là lãi, bỏ ngày là lỗ
          </p>
        </div>
      </div>

      {/* ─── Stats row ─── */}
      <div className="smp__stats">
        <div className={`smp__stat-card ${currentStreak > 0 ? 'smp__stat-card--fire' : ''}`}>
          <FireIcon className="smp__stat-icon smp__stat-icon--fire" />
          <div>
            <div className="smp__stat-value">{currentStreak}</div>
            <div className="smp__stat-label">Streak hiện tại</div>
          </div>
        </div>

        <div className="smp__stat-card">
          <TrophyIcon className="smp__stat-icon smp__stat-icon--gold" />
          <div>
            <div className="smp__stat-value">{bestStreak}</div>
            <div className="smp__stat-label">Streak tốt nhất</div>
          </div>
        </div>

        <div className={`smp__stat-card ${isPositiveTrend ? 'smp__stat-card--pos' : 'smp__stat-card--neg'}`}>
          {isPositiveTrend
            ? <ArrowTrendingUpIcon className="smp__stat-icon smp__stat-icon--pos" />
            : <ArrowTrendingDownIcon className="smp__stat-icon smp__stat-icon--neg" />
          }
          <div>
            <div className={`smp__stat-value ${isPositiveTrend ? 'smp__stat-value--pos' : 'smp__stat-value--neg'}`}>
              {todayMomentum > 0 ? '+' : ''}{todayMomentum}
            </div>
            <div className="smp__stat-label">Momentum</div>
          </div>
        </div>

        <div className="smp__stat-card">
          <CalendarDaysIcon className="smp__stat-icon smp__stat-icon--blue" />
          <div>
            <div className="smp__stat-value">
              {goalDays}<span className="smp__stat-denom">/{days.length}</span>
            </div>
            <div className="smp__stat-label">Ngày đạt mục tiêu</div>
          </div>
        </div>
      </div>

      {/* ─── Chart card ─── */}
      <div className="card smp__chart-card">
        {/* Card header */}
        <div className="smp__card-header">
          <div className="smp__header-left">
            <div className={`smp__streak-badge ${currentStreak > 0 ? 'smp__streak-badge--active' : ''}`}>
              <FireIcon className="smp__fire-icon" />
              <span className="smp__streak-count">{currentStreak}</span>
              <span className="smp__streak-unit">ngày</span>
            </div>
            <div className="smp__status">
              {isPositiveTrend ? (
                <>
                  <ArrowTrendingUpIcon className="smp__trend-icon smp__trend-up" />
                  <span className="smp__status-text smp__status-up">Đang trên đà lãi</span>
                </>
              ) : (
                <>
                  <ArrowTrendingDownIcon className="smp__trend-icon smp__trend-down" />
                  <span className="smp__status-text smp__status-down">Đang nợ bài</span>
                </>
              )}
            </div>
          </div>

          <div className="smp__toggle">
            <button
              className={`smp__toggle-btn ${mode === '7' ? 'smp__toggle-btn--on' : ''}`}
              onClick={() => switchMode('7')}
            >
              7 ngày
            </button>
            <button
              className={`smp__toggle-btn ${mode === '30' ? 'smp__toggle-btn--on' : ''}`}
              onClick={() => switchMode('30')}
            >
              30 ngày
            </button>
          </div>
        </div>

        {/* Info panel — updates on hover, stays visible */}
        <div className={`smp__info-panel ${hovered ? (hovered.momentum >= 0 ? 'smp__info-panel--pos' : 'smp__info-panel--neg') : ''}`}>
          {hovered ? (
            <>
              <span className="smp__info-date">{hovered.fullLabel}</span>
              <span className={`smp__info-momentum ${hovered.momentum >= 0 ? 'pos' : 'neg'}`}>
                {hovered.momentum >= 0 ? '+' : ''}{hovered.momentum} điểm
              </span>
              <span className="smp__info-action">
                {hovered.metGoal
                  ? `✓ Đã học ${hovered.count}/${dailyGoal} lượt`
                  : hovered.count > 0
                    ? `✗ Học ${hovered.count}/${dailyGoal} — chưa đủ`
                    : '✗ Bỏ lỡ mục tiêu'}
              </span>
            </>
          ) : (
            <span className="smp__info-hint">
              <BoltIcon style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
              Di chuột vào cột để xem chi tiết từng ngày
            </span>
          )}
        </div>

        {/* Chart body */}
        <div className={`smp__chart ${mode === '30' ? 'smp__chart--30' : ''}`}>
          {/* Absolute baseline line */}
          <div className="smp__baseline" />
          {/* Baseline label */}
          <div className="smp__baseline-label">0 · Hòa vốn</div>

          {/* Columns */}
          <div className="smp__cols">
            {days.map((d, i) => {
              const posH = d.momentum > 0
                ? Math.max((d.momentum / maxAbs) * ZONE_H, 4)
                : 0;
              const negH = d.momentum < 0
                ? Math.max((Math.abs(d.momentum) / maxAbs) * ZONE_H, 4)
                : 0;

              return (
                <div
                  key={`col-${mode}-${d.date}`}
                  className={`smp__col ${hoveredIdx === i ? 'smp__col--hov' : ''}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Positive half — bar sticks to bottom (baseline) */}
                  <div className="smp__half smp__half--pos">
                    {posH > 0 && (
                      <div
                        key={`p-${animKey}-${d.date}`}
                        className={`smp__bar smp__bar--pos${d.isToday ? ' smp__bar--today-pos' : ''}`}
                        style={{
                          height: `${posH}px`,
                          animationDelay: `${i * 0.025}s`,
                        }}
                      />
                    )}
                  </div>

                  {/* Negative half — bar sticks to top (baseline) */}
                  <div className="smp__half smp__half--neg">
                    {negH > 0 && (
                      <div
                        key={`n-${animKey}-${d.date}`}
                        className={`smp__bar smp__bar--neg${d.isToday ? ' smp__bar--today-neg' : ''}`}
                        style={{
                          height: `${negH}px`,
                          animationDelay: `${i * 0.025}s`,
                        }}
                      />
                    )}
                  </div>

                  {/* Day label */}
                  <div
                    className={`smp__day-label${d.isToday ? ' smp__day-label--today' : ''}${!showLabel(i) ? ' smp__day-label--hidden' : ''}`}
                  >
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="smp__legend">
          <div className="smp__legend-item">
            <div className="smp__legend-swatch smp__legend-swatch--pos" />
            <span>Đang lãi — streak dương</span>
          </div>
          <div className="smp__legend-item">
            <div className="smp__legend-swatch smp__legend-swatch--neg" />
            <span>Đang nợ — streak âm</span>
          </div>
          <div className="smp__legend-goal">
            Mục tiêu mỗi ngày: <strong>{dailyGoal}</strong> lượt ôn
          </div>
        </div>
      </div>

      {/* ─── Smart shortcuts — "Đơn thuốc hôm nay" ─── */}
      <div className="card smp__rx-card">
        <div className="smp__rx-header">
          <h3 className="smp__rx-title">Đơn thuốc hôm nay</h3>
          <p className="smp__rx-sub">
            {isNegative
              ? 'Biểu đồ đang đỏ — ưu tiên trả nợ để kéo vạch về bờ'
              : 'Giữ vững phong độ hoặc bứt phá để cột xanh vọt cao hơn'}
          </p>
        </div>

        <div className="smp__rx-grid">
          {/* Recovery — chỉ hiện khi đang âm */}
          {isNegative && !recoveryDisabled && (
            <button
              className="smp__rx-btn smp__rx-btn--recovery"
              onClick={() => goPractice(recovery.count, recovery.preset)}
            >
              <div className="smp__rx-icon smp__rx-icon--recovery">
                <LifebuoyIcon />
              </div>
              <div className="smp__rx-body">
                <span className="smp__rx-name">🆘 Trả nợ / Cắt lỗ</span>
                <span className="smp__rx-desc">
                  Đang nợ {Math.round(debt)} điểm — ôn <strong>{recovery.count} từ</strong> để về hòa vốn
                </span>
              </div>
              <ChevronRightIcon className="smp__rx-arrow" />
            </button>
          )}

          {/* Maintain */}
          <button
            className="smp__rx-btn smp__rx-btn--maintain"
            onClick={() => goPractice(maintain.count, maintain.preset)}
            disabled={maintainDisabled}
          >
            <div className="smp__rx-icon smp__rx-icon--maintain">
              <ShieldCheckIcon />
            </div>
            <div className="smp__rx-body">
              <span className="smp__rx-name">Giữ phong độ</span>
              <span className="smp__rx-desc">
                {maintainDisabled
                  ? 'Chưa có từ nào để ôn — hãy học từ mới trước'
                  : <>Ôn <strong>{maintain.count} từ</strong>{due !== null && due > 0 ? ` (${due} quá hạn + bổ sung)` : ''} — giữ vạch không đỏ</>}
              </span>
            </div>
            <ChevronRightIcon className="smp__rx-arrow" />
          </button>

          {/* Boost — học từ mới, tối đa 5 từ, có hiệu ứng lấp lánh */}
          <button
            className="smp__rx-btn smp__rx-btn--boost"
            onClick={() => goPractice(boostCount, 'new')}
            disabled={boostDisabled}
          >
            <div className="smp__rx-shimmer" />
            <div className="smp__rx-icon smp__rx-icon--boost">
              <RocketLaunchIcon />
            </div>
            <div className="smp__rx-body">
              <span className="smp__rx-name">Bứt phá / Tăng trưởng</span>
              <span className="smp__rx-desc">
                {boostDisabled
                  ? 'Đã học hết từ mới — giỏi quá!'
                  : <>Học <strong>{boostCount} từ mới</strong> — mở rộng vốn từ</>}
              </span>
            </div>
            <ChevronRightIcon className="smp__rx-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
}
