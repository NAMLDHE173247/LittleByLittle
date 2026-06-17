import React from 'react';
import './LandingPage.css';
import { SparklesIcon, ArrowRightIcon, AcademicCapIcon, SpeakerWaveIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface LandingPageProps {
  darkMode: boolean;
  onLoginClick: () => void;
}

export function LandingPage({ darkMode, onLoginClick }: LandingPageProps) {
  return (
    <div className={`landing-page ${darkMode ? 'dark' : ''}`}>
      <div className="landing-hero">
        <div className="hero-bg-shapes">
          <div className="hero-shape shape-1"></div>
          <div className="hero-shape shape-2"></div>
        </div>

        <div className="hero-badge">
          <SparklesIcon style={{ width: 16, height: 16 }} />
          <span>Phiên bản Beta 1.0</span>
        </div>

        <h1 className="hero-title">
          Chinh phục từ vựng với <br />
          <span className="text-gradient">LittleByLittle</span>
        </h1>

        <p className="hero-subtitle">
          Hệ thống học từ vựng ngắt quãng thông minh. Ghi nhớ lâu hơn, học tập hiệu quả hơn bằng Flashcards, Trắc nghiệm và Luyện phát âm AI.
        </p>

        <div className="hero-actions">
          <button className="btn-landing-primary" onClick={onLoginClick}>
            Bắt đầu trải nghiệm ngay <ArrowRightIcon style={{ width: 20, height: 20, strokeWidth: 2.5 }} />
          </button>
        </div>
      </div>

      <div className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper blue">
              <AcademicCapIcon style={{ width: 28, height: 28 }} />
            </div>
            <h3 className="feature-title">Lặp lại Ngắt quãng (Spaced Repetition)</h3>
            <p className="feature-desc">Thuật toán thông minh giúp xác định chính xác thời điểm bạn sắp quên từ để nhắc lại, tối ưu hoá trí nhớ dài hạn.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper purple">
              <SpeakerWaveIcon style={{ width: 28, height: 28 }} />
            </div>
            <h3 className="feature-title">Luyện Phát âm với AI</h3>
            <p className="feature-desc">Công nghệ nhận diện giọng nói giúp bạn chuẩn hoá phát âm theo người bản xứ một cách chính xác.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper orange">
              <ChartBarIcon style={{ width: 28, height: 28 }} />
            </div>
            <h3 className="feature-title">Thống kê Độ Thành Thạo</h3>
            <p className="feature-desc">Theo dõi tiến độ học tập chi tiết qua từng kỹ năng (Nghe, Nói, Đọc, Viết) giúp bạn dễ dàng đo lường sự tiến bộ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
