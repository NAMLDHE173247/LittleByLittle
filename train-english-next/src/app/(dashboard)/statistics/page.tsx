"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import StatisticsPage from '@/components/features/Statistics/StatisticsPage';

export default function StatisticsRoute() {
  const { progressData, progressLoading, seedingDemo, setSeedingDemo, getLevelColor } = useGlobalData();

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
