"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import DecksPage from '@/components/features/Decks/DecksPage';

export default function DecksRoute() {
  const { decks, fetchDecks, fetchVocabularies, fetchMetadata, setFilterDeck } = useGlobalData();
  const router = useRouter();

  const handleDeckClick = (deckId: string) => {
    router.push(`/decks/${deckId}`);
  };

  return (
    <DecksPage
      decks={decks}
      fetchDecks={fetchDecks}
      fetchVocabularies={fetchVocabularies}
      fetchMetadata={fetchMetadata}
      onDeckClick={handleDeckClick}
    />
  );
}
