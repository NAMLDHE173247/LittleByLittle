"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import MasteryPage from '@/components/features/Mastery/MasteryPage';
import { useAuth } from '@/AuthContext';

export default function MasteryRoute() {
  const {
    masteryWords, masteryLoading, masteryPagination, masteryTierSummary,
    masteryTierFilter, setMasteryTierFilter, masterySkillFilter, setMasterySkillFilter,
    masterySearch, setMasterySearch, masterySort, setMasterySort,
    masteryPage, setMasteryPage, fetchMasteryWords,
    clearingProgress, seedingDemo, showScoringOverview, setShowScoringOverview,
    getLevelColor
  } = useGlobalData();

  const { authHeaders } = useAuth();

  const adjustPoints = async (wordId: string, skill: string, amount: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/adjust`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ wordId, skill, amount })
      });
      if (res.ok) {
        fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to adjust points:', error);
    }
  };

  const clearWordProgress = async (wordId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tiến độ của từ này?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/clear/${wordId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to clear progress:', error);
    }
  };

  const clearAllProgress = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ tiến độ? Hành động này không thể hoàn tác.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/clear`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to clear all progress:', error);
    }
  };

  const seedDemoData = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/seed-demo`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to seed demo data:', error);
    }
  };

  return (
    <MasteryPage
      masteryWords={masteryWords}
      masteryLoading={masteryLoading}
      masteryPagination={masteryPagination}
      masteryTierSummary={masteryTierSummary}
      masteryTierFilter={masteryTierFilter}
      setMasteryTierFilter={setMasteryTierFilter}
      masterySkillFilter={masterySkillFilter}
      setMasterySkillFilter={setMasterySkillFilter}
      masterySearch={masterySearch}
      setMasterySearch={setMasterySearch}
      masterySort={masterySort}
      setMasterySort={setMasterySort}
      masteryPage={masteryPage}
      setMasteryPage={setMasteryPage}
      fetchMasteryWords={fetchMasteryWords}
      adjustPoints={adjustPoints}
      clearWordProgress={clearWordProgress}
      clearAllProgress={clearAllProgress}
      clearingProgress={clearingProgress}
      seedDemoData={seedDemoData}
      seedingDemo={seedingDemo}
      showScoringOverview={showScoringOverview}
      setShowScoringOverview={setShowScoringOverview}
      getLevelColor={getLevelColor}
    />
  );
}
