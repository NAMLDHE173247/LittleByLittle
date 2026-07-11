"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import WritingMode from '@/components/features/Writing/WritingMode';

export default function WritingRoute() {
  const router = useRouter();
  const { decks } = useGlobalData();
  const [initialWords, setInitialWords] = useState<any[] | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('writingWords');
    if (saved) {
      try {
        setInitialWords(JSON.parse(saved));
      } catch (e) {}
      sessionStorage.removeItem('writingWords');
    }
  }, []);

  return (
    <WritingMode
      decks={decks}
      initialWords={initialWords || undefined}
      onExit={() => router.push('/vocabulary')}
    />
  );
}
