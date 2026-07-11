"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import WritingMode from '@/components/features/Writing/WritingMode';

export default function WritingRoute() {
  const router = useRouter();
  const { decks } = useGlobalData();

  return (
    <WritingMode
      decks={decks}
      onExit={() => router.push('/vocabulary')}
    />
  );
}
