import React, { useState, useEffect } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface QuizQuestionImageProps {
  imageUrl: string;
  questionId: string;
}

export default function QuizQuestionImage({ imageUrl, questionId }: QuizQuestionImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Reset status when question changes to avoid race conditions
  useEffect(() => {
    setStatus('loading');
  }, [questionId, imageUrl]);

  return (
    <div className="quiz-question-image-wrapper">
      {status === 'loading' && (
        <div className="quiz-question-image-skeleton" />
      )}
      
      {status === 'error' && (
        <div className="quiz-question-image-error">
          <PhotoIcon className="quiz-question-image-error-icon" />
        </div>
      )}

      <img
        src={imageUrl}
        alt="Ảnh minh họa từ vựng" // Neutral text to avoid leaking answers
        decoding="async" // Async decoding to prevent blocking main thread
        className={`quiz-question-image ${status === 'loaded' ? 'loaded' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
