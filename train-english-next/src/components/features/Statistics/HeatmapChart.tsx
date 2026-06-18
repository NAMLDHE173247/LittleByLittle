"use client";

import React, { useMemo } from 'react';

export interface DailyActivityData {
  _id: string;
  userId: string;
  dateString: string;
  totalReviews: number;
  skills: {
    recall: number;
    listening: number;
    writing: number;
    pronunciation: number;
  };
}

interface HeatmapChartProps {
  data: DailyActivityData[];
}

export default function HeatmapChart({ data }: HeatmapChartProps) {
  // Generate last 365 days
  const days = useMemo(() => {
    const list = [];
    const today = new Date();
    // Generate exactly 365 days up to today
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const match = data.find(x => x.dateString === dateStr);
      list.push({
        date: dateStr,
        count: match ? match.totalReviews : 0
      });
    }
    return list;
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'var(--bg-input)';
    if (count <= 15) return '#a7f3d0'; // emerald-200
    if (count <= 40) return '#34d399'; // emerald-400
    if (count <= 80) return '#059669'; // emerald-600
    return '#fbbf24'; // amber-400
  };

  const getTierName = (count: number) => {
    if (count === 0) return 'Nghỉ ngơi';
    if (count <= 15) return 'Khởi động';
    if (count <= 40) return 'Chăm chỉ';
    if (count <= 80) return 'Bứt phá';
    return 'Xuất sắc';
  };

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 600, fontSize: '18px' }}>
        Bản đồ nhiệt 365 ngày 🏆
      </h3>
      
      <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateRows: 'repeat(7, 1fr)', 
          gridAutoFlow: 'column', 
          gap: '4px', 
          width: 'max-content' 
        }}>
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} lượt (${getTierName(d.count)})`}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: getColor(d.count),
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <span>Ít</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(0) }} title="Nghỉ ngơi" />
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(10) }} title="Khởi động" />
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(30) }} title="Chăm chỉ" />
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(60) }} title="Bứt phá" />
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getColor(100) }} title="Xuất sắc" />
        </div>
        <span>Nhiều</span>
      </div>
    </div>
  );
}
