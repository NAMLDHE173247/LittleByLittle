"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/AuthContext";
import DeckMasteryView from "@/components/features/Decks/DeckMasteryView";
import FlashcardsPage from "@/components/features/Flashcards/FlashcardsPage";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useProgress } from "@/hooks/useProgress";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export default function DeckMasteryRoute() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.id as string;
  const { authHeaders } = useAuth();
  const { mutate } = useProgress();
  
  const [deck, setDeck] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Flashcard words
  const [allWords, setAllWords] = useState<any[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);

  useEffect(() => {
    if (!deckId) return;
    
    const fetchDeckInfo = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/decks/${deckId}`, {
          headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
          setDeck(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch deck info", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeckInfo();
  }, [deckId, authHeaders]);

  // Fetch all words for flashcards
  useEffect(() => {
    if (!deckId) return;

    const fetchAllWords = async () => {
      try {
        const params = new URLSearchParams({
          deckId,
          page: "1",
          limit: "2000", // Fetch a large amount to get all words for flashcards
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/progress/words?${params}`, {
          headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
          setAllWords(json.data.words || []);
        }
      } catch (err) {
        console.error("Failed to fetch all words for flashcards", err);
      } finally {
        setLoadingWords(false);
      }
    };

    fetchAllWords();
  }, [deckId, authHeaders]);

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

  return (
    <div className="deck-mastery-page" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <button 
        onClick={() => router.push("/decks")} 
        style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "8px", 
          background: "none", 
          border: "none", 
          color: "var(--text-secondary)", 
          cursor: "pointer",
          marginBottom: "20px",
          fontSize: "14px",
          fontWeight: 500
        }}
      >
        <ArrowLeftIcon style={{ width: "16px", height: "16px" }} /> Quay lại bộ thẻ
      </button>

      <div style={{ marginBottom: "24px" }}>
        {loading ? (
          <div style={{ height: "32px", width: "200px", background: "var(--bg-card)", borderRadius: "4px", animation: "pulse 1.5s infinite" }} />
        ) : (
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "var(--text-primary)" }}>
            Độ thông thạo: <span style={{ color: deck?.color || "var(--primary-color)" }}>{deck?.name || "Bộ thẻ"}</span>
          </h1>
        )}
        {deck?.description && (
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "15px" }}>{deck.description}</p>
        )}
      </div>

      {!loadingWords && allWords.length > 0 && (
        <div className="deck-fc-wrapper" style={{ marginBottom: "40px" }}>
          <FlashcardsPage vocabularies={allWords} submitProgress={submitProgress} />
        </div>
      )}

      <DeckMasteryView deckId={deckId} />
    </div>
  );
}
