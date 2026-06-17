"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import FlashcardsPage from '@/components/features/Flashcards/FlashcardsPage';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/AuthContext';

export default function FlashcardsRoute() {
  const { vocabularies } = useGlobalData();
  const { authHeaders } = useAuth();
  const { mutate } = useProgress();

  const submitProgress = async (wordId: string, skill: string, isCorrect: boolean) => {
    try {
      const updatePromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ wordId, skill, correct: isCorrect })
      });

      // Optimistic update without waiting for fetch
      mutate(async () => {
        await updatePromise;
        return undefined; // triggers revalidation
      }, { revalidate: true });
    } catch (error) {
      console.error('Failed to submit flashcard progress:', error);
    }
  };

  return <FlashcardsPage vocabularies={vocabularies} submitProgress={submitProgress} />;
}
