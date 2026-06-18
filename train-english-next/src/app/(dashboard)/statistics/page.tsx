"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import { useAuth } from '@/AuthContext';
import StatisticsPage from '@/components/features/Statistics/StatisticsPage';
import { useProgress } from '@/hooks/useProgress';

export default function StatisticsRoute() {
  const { seedingDemo, setSeedingDemo, getLevelColor } = useGlobalData();
  const { authHeaders } = useAuth();
  const { progressData, isLoading: progressLoading, mutate } = useProgress();

  const seedDemoData = async () => {};

  return (
    <StatisticsPage
      progressData={progressData}
      progressLoading={progressLoading}
      seedingDemo={seedingDemo}
      seedDemoData={seedDemoData}
      getLevelColor={getLevelColor}
    />
  );
}

