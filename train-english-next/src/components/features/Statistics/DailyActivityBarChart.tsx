"use client";

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DailyActivityData } from './HeatmapChart';

interface DailyActivityBarChartProps {
  data: DailyActivityData[];
}

export default function DailyActivityBarChart({ data }: DailyActivityBarChartProps) {
  // Generate last 14 days
  const chartData = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      
      const match = data.find(x => x.dateString === dateStr);
      list.push({
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        dateString: dateStr,
        recall: match?.skills?.recall || 0,
        listening: match?.skills?.listening || 0,
        writing: match?.skills?.writing || 0,
        pronunciation: match?.skills?.pronunciation || 0,
        total: match?.totalReviews || 0
      });
    }
    return list;
  }, [data]);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontWeight: 600, fontSize: '18px' }}>
        Chi tiết ôn tập (14 ngày qua) 📊
      </h3>
      
      <div style={{ height: '256px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 5,
              left: -20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="recall" name="Nhớ từ" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
            <Bar dataKey="listening" name="Nghe" stackId="a" fill="#10b981" />
            <Bar dataKey="writing" name="Viết" stackId="a" fill="#f59e0b" />
            <Bar dataKey="pronunciation" name="Phát âm" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
