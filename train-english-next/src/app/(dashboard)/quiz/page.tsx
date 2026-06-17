"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import QuizPage from '@/components/features/Quiz/QuizPage';

import { useAuth } from '@/AuthContext';

export default function QuizRoute() {
  const router = useRouter();
  const { vocabularies, decks, masteryWords, openEditModal, speak, fetchMasteryWords } = useGlobalData();
  const { authHeaders } = useAuth();

  const submitProgress = async (wordId: string, skill: string, isCorrect: boolean) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ wordId, skill, isCorrect })
      });
      if (res.ok) {
        // Refresh mastery data to reflect the changes
        fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to submit progress:', error);
    }
  };

  return (
    <QuizPage
      vocabularies={vocabularies}
      decks={decks}
      masteryWords={masteryWords}
      onExit={() => router.push('/vocabulary')}
      onEditWord={openEditModal}
      speak={speak}
      submitProgress={submitProgress}
    />
  );
}
