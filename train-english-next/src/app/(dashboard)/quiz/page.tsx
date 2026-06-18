"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import QuizPage from '@/components/features/Quiz/QuizPage';
import { useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/AuthContext';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

export default function QuizRoute() {
  const router = useRouter();
  const { vocabularies, decks, masteryWords, openEditModal, speak, fetchMasteryWords } = useGlobalData();
  const { authHeaders } = useAuth();
  const { mutate } = useProgress();

  const submitProgress = async (wordId: string, skill: string, isCorrect: boolean, isHinted: boolean = false) => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const updatePromise = fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ wordId, skill, correct: isCorrect, clientDateString: todayStr, isHinted })
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

      // Optimistic SWR refresh for stats, while also refreshing mastery words
      mutate(async () => {
        await updatePromise;
        fetchMasteryWords(); // Quiz relies on this for word mastery display
        return undefined;
      }, { revalidate: true });
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
