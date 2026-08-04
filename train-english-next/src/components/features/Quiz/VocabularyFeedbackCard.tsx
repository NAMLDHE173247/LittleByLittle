import React from 'react';

// This is a minimal definition based on QuizPage.tsx's VocabularyItem
interface VocabularyItem {
  _id?: string;
  wordId?: string;
  word: string;
  meanings: string[];
  examples?: { en?: string; vi?: string }[];
  synonyms?: string[];
  antonyms?: string[];
  type?: string;
  pronunciation?: string;
}

function normalizeWords(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(
    values
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean)
  ));
}

function normalizeExamples(examples: VocabularyItem['examples']): { en: string; vi: string }[] {
  if (!Array.isArray(examples)) return [];
  return examples
    .map(example => ({
      en: typeof example?.en === 'string' ? example.en.trim() : '',
      vi: typeof example?.vi === 'string' ? example.vi.trim() : '',
    }))
    .filter(example => example.en || example.vi);
}

interface VocabularyFeedbackCardProps {
  vocab: VocabularyItem;
  statusText: React.ReactNode;
  type?: string;
  pronunciation?: string;
  variant?: 'default' | 'inline';
  showSummary?: boolean;
  showExamples?: boolean;
  showRelations?: boolean;
}

export default function VocabularyFeedbackCard({
  vocab,
  statusText,
  type,
  pronunciation,
  variant = 'default',
  showSummary = true,
  showExamples = true,
  showRelations = true,
}: VocabularyFeedbackCardProps) {
  const uniqueMeanings = normalizeWords(vocab.meanings);
  const uniqueSynonyms = normalizeWords(vocab.synonyms);
  const uniqueAntonyms = normalizeWords(vocab.antonyms);
  const validExamples = normalizeExamples(vocab.examples);

  return (
    <div className={`quiz-feedback-card ${variant === 'inline' ? 'inline' : ''}`}>
      <div className="quiz-feedback-status">
        {statusText}
      </div>

      <div className="quiz-feedback-details">
        {showSummary && <div className="quiz-feedback-summary">
          {(type || pronunciation) && (
            <div className="quiz-word-meta quiz-feedback-word-meta">
              {type && <span>Loại từ: <strong>{type}</strong></span>}
              {type && pronunciation && <span className="quiz-word-meta-divider">|</span>}
              {pronunciation && <span>Phiên âm: <strong>{pronunciation}</strong></span>}
            </div>
          )}

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
        </div>}

        {((showExamples && validExamples.length > 0) ||
          (showRelations && (uniqueSynonyms.length > 0 || uniqueAntonyms.length > 0))) && (
          <div className="quiz-feedback-content-grid">

          {/* Examples */}
          {showExamples && validExamples.length > 0 && (
            <div className="quiz-feedback-section-block quiz-feedback-examples-block">
              <h4 className="quiz-feedback-section-title">Ví dụ</h4>
              {validExamples.map((example, index) => (
                <div key={`${example.en}-${example.vi}-${index}`} className="quiz-feedback-example">
                  {example.en && (
                    <div className="quiz-feedback-example-row">
                      <span className="quiz-feedback-example-label en">EN</span>
                      <span className="quiz-feedback-example-text">{example.en}</span>
                    </div>
                  )}
                  {example.vi && (
                    <div className="quiz-feedback-example-row">
                      <span className="quiz-feedback-example-label vi">VI</span>
                      <span className="quiz-feedback-example-text">{example.vi}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Synonyms */}
          {showRelations && uniqueSynonyms.length > 0 && (
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
          {showRelations && uniqueAntonyms.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
