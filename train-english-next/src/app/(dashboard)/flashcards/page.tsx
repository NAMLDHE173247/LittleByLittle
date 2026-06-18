"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import FlashcardsPage from '@/components/features/Flashcards/FlashcardsPage';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export default function FlashcardsRoute() {
  const { vocabularies } = useGlobalData();
  const { authHeaders } = useAuth();
  const { mutate } = useProgress();

  const submitProgress = async (wordId: string, skill: string, isCorrect: boolean) => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const updatePromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ wordId, skill, correct: isCorrect, clientDateString: todayStr })
      });

      // Handle Gamification async
      updatePromise.then(res => res.json()).then(data => {
        if (data.success && data.data?.todayTotalReviews) {
          const reviews = data.data.todayTotalReviews;
          if (reviews === 41) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            toast.success("Tuyệt vời! Bạn đang cực kỳ Bứt phá ngày hôm nay! 🔥");
          } else if (reviews === 81) {
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            toast.success("Xuất sắc! Trạng thái Siêu nhân đã được kích hoạt! 🦸‍♂️");
          }
        }
      }).catch(console.error);

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
