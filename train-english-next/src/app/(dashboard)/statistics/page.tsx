"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import StatisticsPage from '@/components/features/Statistics/StatisticsPage';
import { useProgress } from '@/hooks/useProgress';

export default function StatisticsRoute() {
  const { seedingDemo, setSeedingDemo, getLevelColor } = useGlobalData();
  const { progressData, isLoading: progressLoading } = useProgress();

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
