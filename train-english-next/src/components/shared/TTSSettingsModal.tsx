import React, { useEffect, useState } from 'react';
import { useGlobalData } from '@/components/providers/GlobalDataProvider';
import { XMarkIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import './TTSSettingsModal.css';

interface TTSSettingsModalProps {
  onClose: () => void;
}

export default function TTSSettingsModal({ onClose }: TTSSettingsModalProps) {
  const { ttsAccent, updateTtsAccent, activeVoiceName, speak, cancelSpeech } = useGlobalData();
  const [accent, setAccent] = useState<'en-US' | 'en-GB'>(ttsAccent || 'en-US');

  useEffect(() => {
    // Sync local state when provider's state updates
    setAccent(ttsAccent);
  }, [ttsAccent]);

  // When unmounting, we stop the preview speech so it doesn't linger
  useEffect(() => {
    return () => {
      cancelSpeech('tts-settings-close');
    };
  }, [cancelSpeech]);

  const handleAccentChange = (newAccent: 'en-US' | 'en-GB') => {
    setAccent(newAccent);
    updateTtsAccent(newAccent);
  };

  const handlePreview = () => {
    const text = accent === 'en-US' 
      ? 'Hello, this is how I will pronounce American English.'
      : 'Hello, this is how I will pronounce British English.';
      
    speak(text, { 
      mode: 'manual', 
      source: 'settings-preview', 
      ownerId: 'tts-settings-modal' 
    });
  };

  return (
    <div className="tts-modal-backdrop" onClick={onClose}>
      <div className="tts-modal-container" onClick={e => e.stopPropagation()}>
        <div className="tts-modal-header">
          <h3>Cài đặt phát âm</h3>
          <button className="tts-modal-close" onClick={onClose}>
            <XMarkIcon className="tts-icon-small" />
          </button>
        </div>
        
        <p className="tts-modal-desc">
          Áp dụng chung cho Flashcard và Quiz. Thay đổi sẽ có hiệu lực ngay lập tức.
        </p>

        <div className="tts-options">
          <label className={`tts-option-card ${accent === 'en-US' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="accent" 
              value="en-US"
              checked={accent === 'en-US'}
              onChange={() => handleAccentChange('en-US')}
            />
            <div className="tts-option-content">
              <span className="tts-option-title">Anh–Mỹ</span>
              <span className="tts-option-subtitle">en-US</span>
            </div>
          </label>

          <label className={`tts-option-card ${accent === 'en-GB' ? 'active' : ''}`}>
            <input 
              type="radio" 
              name="accent" 
              value="en-GB"
              checked={accent === 'en-GB'}
              onChange={() => handleAccentChange('en-GB')}
            />
            <div className="tts-option-content">
              <span className="tts-option-title">Anh–Anh</span>
              <span className="tts-option-subtitle">en-GB</span>
            </div>
          </label>
        </div>

        <div className="tts-preview-area">
          <button className="tts-preview-btn" onClick={handlePreview}>
            <SpeakerWaveIcon className="tts-icon-small" /> Nghe thử
          </button>
          {activeVoiceName ? (
            <span className="tts-active-voice">Đang dùng: {activeVoiceName}</span>
          ) : (
            <span className="tts-active-voice fallback">Giọng tiếng Anh dự phòng</span>
          )}
        </div>
      </div>
    </div>
  );
}
