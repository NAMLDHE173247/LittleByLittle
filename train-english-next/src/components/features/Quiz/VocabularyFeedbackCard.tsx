import React from 'react';

// This is a minimal definition based on QuizPage.tsx's VocabularyItem
interface VocabularyItem {
  _id?: string;
  wordId?: string;
  word: string;
  meanings: string[];
  examples?: { en: string; vi: string }[];
  synonyms?: string[];
  antonyms?: string[];
  pronunciation?: string;
}

interface VocabularyFeedbackCardProps {
  vocab: VocabularyItem;
  statusText: React.ReactNode;
  variant?: 'default' | 'inline';
}

export default function VocabularyFeedbackCard({ vocab, statusText, variant = 'default' }: VocabularyFeedbackCardProps) {
  // Loại bỏ nghĩa trùng lặp
  const uniqueMeanings = Array.from(new Set(vocab.meanings || []));
  const uniqueSynonyms = Array.from(new Set(vocab.synonyms || []));
  const uniqueAntonyms = Array.from(new Set(vocab.antonyms || []));

  return (
    <div className={`quiz-feedback-card ${variant === 'inline' ? 'inline' : ''}`}>
      <div className="quiz-feedback-status">
        {statusText}
      </div>

      <div className="quiz-feedback-details">
        {/* Word and Primary Meaning (Only in default variant) */}
        {variant !== 'inline' && (
          <div className="quiz-feedback-header">
            <h3 className="quiz-feedback-word">{vocab.word}</h3>
            {vocab.pronunciation && <span className="quiz-feedback-pronunciation">{vocab.pronunciation}</span>}
          </div>
        )}

        {uniqueMeanings.length > 0 && (
          <div className="quiz-feedback-meanings">
            {uniqueMeanings.map((meaning, idx) => (
              <div key={idx} className="quiz-feedback-meaning-line">{meaning}</div>
            ))}
          </div>
        )}

        {/* Examples */}
        {vocab.examples && vocab.examples.length > 0 && (
          <div className="quiz-feedback-section-block">
            <h4 className="quiz-feedback-section-title">Ví dụ</h4>
            <div className="quiz-feedback-example">
              <div className="quiz-feedback-example-row">
                <span className="quiz-feedback-example-label en">EN</span>
                <span className="quiz-feedback-example-text">{vocab.examples[0].en}</span>
              </div>
              {vocab.examples[0].vi && (
                <div className="quiz-feedback-example-row">
                  <span className="quiz-feedback-example-label vi">VI</span>
                  <span className="quiz-feedback-example-text">{vocab.examples[0].vi}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Synonyms */}
        {uniqueSynonyms.length > 0 && (
          <div className="quiz-feedback-section-block">
            <h4 className="quiz-feedback-section-title">Từ đồng nghĩa</h4>
            <div className="quiz-feedback-tags">
              {uniqueSynonyms.map((syn, idx) => (
                <span key={idx} className="quiz-feedback-tag">{syn}</span>
              ))}
            </div>
          </div>
        )}

        {/* Antonyms */}
        {uniqueAntonyms.length > 0 && (
          <div className="quiz-feedback-section-block">
            <h4 className="quiz-feedback-section-title">Từ trái nghĩa</h4>
            <div className="quiz-feedback-tags">
              {uniqueAntonyms.map((ant, idx) => (
                <span key={idx} className="quiz-feedback-tag">{ant}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
