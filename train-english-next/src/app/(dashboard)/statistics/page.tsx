"use client";
import React from 'react';
import useSWR from 'swr';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import { useAuth } from '@/AuthContext';
import StatisticsPage from '@/components/features/Statistics/StatisticsPage';
import { useProgress } from '@/hooks/useProgress';

export default function StatisticsRoute() {
  const { seedingDemo, setSeedingDemo, getLevelColor } = useGlobalData();
  const { authHeaders } = useAuth();
  const { progressData, isLoading: progressLoading, mutate } = useProgress();

  const fetcher = (url: string) => fetch(url, { headers: authHeaders() }).then(res => res.json());
  const { data: activityRes, isLoading: activityLoading } = useSWR('/api/statistics/daily-activity', fetcher);

  const seedDemoData = async () => {};

  return (
    <StatisticsPage
      progressData={progressData}
      progressLoading={progressLoading}
      activityData={activityRes?.data || []}
      activityLoading={activityLoading}
      seedingDemo={seedingDemo}
      seedDemoData={seedDemoData}
      getLevelColor={getLevelColor}
    />
  );
}

