import React from 'react';

export default function Heatmap({ data = [] }: { data?: { date: string, count: number }[] }) {
  // Generate last 30 days
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const match = data.find(x => x.date === dateStr);
    days.push({
      date: dateStr,
      count: match ? match.count : (Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0) // Mock some data
    });
  }

  const getColor = (count: number) => {
    if (count === 0) return 'var(--bg-input)';
    if (count < 2) return '#dcfce7'; // green-100
    if (count < 4) return '#86efac'; // green-300
    if (count < 6) return '#22c55e'; // green-500
    return '#166534'; // green-800
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 600, fontSize: '18px' }}>Mức độ chăm chỉ (30 ngày qua)</h3>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.date}: ${d.count} bài học`}
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
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
  );
}
