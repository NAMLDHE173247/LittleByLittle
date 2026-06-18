"use client";
import React, { useState } from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import { useAuth } from '@/AuthContext';
import StatisticsPage from '@/components/features/Statistics/StatisticsPage';
import { useProgress } from '@/hooks/useProgress';

export default function StatisticsRoute() {
  const { seedingDemo, setSeedingDemo, getLevelColor } = useGlobalData();
  const { authHeaders } = useAuth();
  const { progressData, isLoading: progressLoading, mutate } = useProgress();
  const [refreshingDecay, setRefreshingDecay] = useState(false);

  const seedDemoData = async () => {};

  const refreshDecay = async () => {
    setRefreshingDecay(true);
    try {
      const res = await fetch('/api/progress/apply-decay', {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        // Re-fetch stats sau khi decay đã apply xong
        await mutate();
      }
    } catch (err) {
      console.error('Error applying decay:', err);
    } finally {
      setRefreshingDecay(false);
    }
  };

  return (
    <StatisticsPage
      progressData={progressData}
      progressLoading={progressLoading}
      seedingDemo={seedingDemo}
      seedDemoData={seedDemoData}
      getLevelColor={getLevelColor}
      refreshDecay={refreshDecay}
      refreshingDecay={refreshingDecay}
    />
  );
}
