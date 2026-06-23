"use client";
import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@/AuthContext';
import StreakMomentumPage from '@/components/features/Streak/StreakMomentumPage';

export default function StreakRoute() {
  const { authHeaders } = useAuth();

  const fetcher = (url: string) =>
    fetch(url, { headers: authHeaders() }).then((res) => res.json());

  const { data: activityRes, isLoading } = useSWR(
    '/api/statistics/daily-activity',
    fetcher,
  );
  const { data: availRes } = useSWR(
    '/api/progress/practice-availability',
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Đang tải dữ liệu streak...</p>
      </div>
    );
  }

  return (
    <StreakMomentumPage
      data={activityRes?.data || []}
      dailyGoal={10}
      availability={availRes?.data || null}
    />
  );
}
