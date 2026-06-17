"use client";
import React from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import DecksPage from '@/components/features/Decks/DecksPage';

export default function DecksRoute() {
  const { decks, fetchDecks, fetchVocabularies, fetchMetadata } = useGlobalData();

  return (
    <DecksPage
      decks={decks}
      fetchDecks={fetchDecks}
      fetchVocabularies={fetchVocabularies}
      fetchMetadata={fetchMetadata}
    />
  );
}
