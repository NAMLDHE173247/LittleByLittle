"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import PracticeFlow from '@/components/features/Practice/PracticeFlow';

export default function PracticeRoute() {
  const router = useRouter();
  const { decks } = useGlobalData();

  return (
    <PracticeFlow
      decks={decks}
      onExit={() => router.push('/vocabulary')}
    />
  );
}
