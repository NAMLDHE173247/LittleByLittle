"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import FlashcardsPage from '@/components/features/Flashcards/FlashcardsPage';

import { useAuth } from '@/AuthContext';

export default function FlashcardsRoute() {
  const { vocabularies, fetchMasteryWords } = useGlobalData();
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
        // Optimistically refresh if needed, or rely on next page load
        // fetchMasteryWords();
      }
    } catch (error) {
      console.error('Failed to submit flashcard progress:', error);
    }
  };

  return <FlashcardsPage vocabularies={vocabularies} submitProgress={submitProgress} />;
}
