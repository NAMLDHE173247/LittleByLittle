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

interface DeckDetail {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  wordCount?: number;
}

type FlashcardWord = Record<string, unknown>;

export default function DeckMasteryRoute() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.id as string;
  const { authHeaders } = useAuth();
  const { mutate } = useProgress();

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [allWords, setAllWords] = useState<FlashcardWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [activeMode, setActiveMode] = useState<string>("learn");
  const [isQuizActive, setIsQuizActive] = useState(false);

  useEffect(() => {
    if (!deckId) return;

    const fetchDeckInfo = async () => {
      if (deckId === "all") {
        setDeck({
          _id: "all",
          name: "Tất cả từ vựng",
          description: "Toàn bộ từ vựng và cụm từ trong kho của bạn",
          color: "#8B5CF6",
        });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/decks/${deckId}`, {
          headers: authHeaders(),
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
  }, [authHeaders, deckId]);

  useEffect(() => {
    if (!deckId) return;

    const fetchAllWords = async () => {
      try {
        let allFetchedWords: any[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const paramsObj: any = {
            page: String(currentPage),
            limit: "100",
          };
          if (deckId !== "all") {
            paramsObj.deckId = deckId;
          }
          const params = new URLSearchParams(paramsObj);
          
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/progress/words?${params}`, {
            headers: authHeaders(),
          });
          const json = await res.json();
          
          if (!res.ok || !json.success || !json.data) {
            throw new Error(json.message || `Failed to fetch page ${currentPage}`);
          }
          
          allFetchedWords = [...allFetchedWords, ...(json.data.words || [])];
          totalPages = json.data.pagination?.totalPages || 1;
          
          currentPage++;
        } while (currentPage <= totalPages);

        setAllWords(allFetchedWords);
      } catch (err) {
        console.error("Failed to fetch all words for flashcards", err);
      } finally {
        setLoadingWords(false);
      }
    };

    fetchAllWords();
  }, [authHeaders, deckId]);

  const submitProgress = async (wordId: string, skill: string, isCorrect: boolean): Promise<boolean> => {
    try {
      const todayStr = new Date().toLocaleDateString("en-CA");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/progress/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ wordId, skill, correct: isCorrect, clientDateString: todayStr }),
      });

      const data = await res.json();

      if (data.success && data.data?.todayTotalReviews) {
        const reviews = data.data.todayTotalReviews;
        if (reviews === 41) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          toast.success("Tuyệt vời! Bạn đang cực kỳ bứt phá ngày hôm nay!");
        } else if (reviews === 81) {
          confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
          toast.success("Xuất sắc! Trạng thái siêu tập trung đã được kích hoạt!");
        }
      }
      if (data.success) {
        mutate(undefined, { revalidate: true });
      }
      return !!data.success;
    } catch (error) {
      console.error("Failed to submit flashcard progress:", error);
      return false;
    }
  };

  return (
    <div className="deck-mastery-page" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {!isQuizActive && (
        <>
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <button
                onClick={() => router.push('/decks')}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <ArrowLeftIcon style={{ width: "16px", height: "16px" }} /> Quay lại bộ thẻ
              </button>

              {loading ? (
                <div
                  style={{
                    height: "32px",
                    width: "200px",
                    background: "var(--bg-card)",
                    borderRadius: "4px",
                    animation: "pulse 1.5s infinite",
                  }}
                />
              ) : (
                <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0, color: "var(--text-primary)" }}>
                  Độ thông thạo:{" "}
                  <span style={{ color: deck?.color || "var(--primary-color)" }}>{deck?.name || "Bộ thẻ"}</span>
                </h1>
              )}
            </div>
            {deck?.description && (
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "15px" }}>{deck.description}</p>
            )}
          </div>
        </>
      )}

      {!loadingWords && allWords.length > 0 && (
        <div className="deck-fc-wrapper" style={{ marginBottom: "40px" }}>
          <FlashcardsPage
            vocabularies={allWords}
            submitProgress={submitProgress}
            onModeChange={setActiveMode}
            onQuizActiveChange={setIsQuizActive}
          />
        </div>
      )}

      {activeMode === "learn" && <DeckMasteryView deckId={deckId} deck={deck} />}
    </div>
  );
}
