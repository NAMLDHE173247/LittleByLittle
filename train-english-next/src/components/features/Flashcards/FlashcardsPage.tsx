import React, { useState, useEffect, useMemo } from 'react'
import {
  Cog6ToothIcon,
  SpeakerWaveIcon,
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'
import './FlashcardsPage.css'

interface FlashcardsPageProps {
  vocabularies: any[]
  submitProgress?: (wordId: string, skill: string, isCorrect: boolean) => void
}

export default function FlashcardsPage({ vocabularies, submitProgress }: FlashcardsPageProps) {
  const [fcIndex, setFcIndex] = useState(0)
  const [fcFlipped, setFcFlipped] = useState(false)
  const [fcShuffled, setFcShuffled] = useState(false)
  const [fcOrder, setFcOrder] = useState<number[]>([])
  const [fcAutoSpeak, setFcAutoSpeak] = useState(false)
  const [fcShowSettings, setFcShowSettings] = useState(false)
  const [fcFrontContent, setFcFrontContent] = useState<'term' | 'definition'>('term')
  const [fcImageDisplay, setFcImageDisplay] = useState<'definition' | 'term' | 'hidden' | 'blurred'>('term')
  const [fcImageSize, setFcImageSize] = useState<'small' | 'large'>('large')
  const [fcPronunciation, setFcPronunciation] = useState<'front' | 'back'>('front')
  const [fcShowStudyGuide, setFcShowStudyGuide] = useState(false)

  const fcCards = useMemo(() => {
    if (fcOrder.length > 0 && fcShuffled) {
      return fcOrder.map(i => vocabularies[i]).filter(Boolean)
    }
    return vocabularies
  }, [vocabularies, fcOrder, fcShuffled])

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      window.speechSynthesis.speak(utterance)
    }
  }

  const fcNext = () => {
    if (fcIndex < fcCards.length - 1) {
      if (submitProgress && fcCards[fcIndex]) {
        submitProgress(fcCards[fcIndex]._id, 'recall', true)
      }
      const newIndex = fcIndex + 1
      setFcIndex(newIndex)
      setFcFlipped(false)
      if (fcAutoSpeak && fcCards[newIndex]) speakWord(fcCards[newIndex].word)
    }
  }

  const fcPrev = () => {
    if (fcIndex > 0) {
      if (submitProgress && fcCards[fcIndex]) {
        submitProgress(fcCards[fcIndex]._id, 'recall', true)
      }
      const newIndex = fcIndex - 1
      setFcIndex(newIndex)
      setFcFlipped(false)
      if (fcAutoSpeak && fcCards[newIndex]) speakWord(fcCards[newIndex].word)
    }
  }

  const fcToggleShuffle = () => {
    if (fcShuffled) {
      setFcShuffled(false)
      setFcOrder([])
    } else {
      const order = vocabularies.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]]
      }
      setFcOrder(order)
      setFcShuffled(true)
    }
    setFcIndex(0)
    setFcFlipped(false)
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowRight') { e.preventDefault(); fcNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); fcPrev() }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFcFlipped(f => !f) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [fcIndex, fcCards, fcAutoSpeak, fcFlipped])

  if (vocabularies.length === 0) {
    return (
      <div className="proficiency-empty">
        <RectangleStackIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
        <p>{'Chưa có từ vựng nào.'}</p>
        <p className="text-muted" style={{ fontSize: 13 }}>{'Thêm từ vựng ở trang Từ vựng để bắt đầu học với Thẻ ghi nhớ.'}</p>
      </div>
    )
  }

  const card = fcCards[fcIndex]
  if (!card) return null

  const frontText = fcFrontContent === 'term' ? card.word : card.meanings.join(', ')
  const backText = fcFrontContent === 'term' ? card.meanings.join(', ') : card.word
  const frontSub = fcPronunciation === 'front' ? card.pronunciation : ''
  const backSub = fcPronunciation === 'back' ? card.pronunciation : ''
  const flipHint = fcFrontContent === 'term' ? 'Nhấn để xem định nghĩa' : 'Nhấn để xem thuật ngữ'
  const backHint = fcFrontContent === 'term' ? 'Nhấn để xem thuật ngữ' : 'Nhấn để xem định nghĩa'
  const showImageOnFront = fcImageDisplay === 'term'
  const showImageOnBack = fcImageDisplay === 'definition'
  const isImageBlurred = fcImageDisplay === 'blurred'
  const isImageHidden = fcImageDisplay === 'hidden'
  const imgSizeClass = fcImageSize === 'large' ? 'fc-back-image fc-image-large' : 'fc-back-image'

  return (
    <div className="fc-page">
      {/* Card Area */}
      <div className="fc-card-area">
        <div
          className={`fc-card-container ${fcFlipped ? 'flipped' : ''}`}
          onClick={() => setFcFlipped(f => !f)}
        >
          {/* Front */}
          <div className="fc-card fc-card-front">
            <button
              className="fc-settings-btn"
              onClick={(e) => { e.stopPropagation(); setFcShowSettings(s => !s) }}
            >
              <Cog6ToothIcon className="icon" />
            </button>
            {fcShowSettings && (
              <div className="fc-settings-dropdown" onClick={e => e.stopPropagation()}>
                <div className="fc-settings-group">
                  <span className="fc-settings-label">Mặt trước thẻ</span>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcFront" checked={fcFrontContent === 'term'} onChange={() => setFcFrontContent('term')} />
                    Hiển thị thuật ngữ
                  </label>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcFront" checked={fcFrontContent === 'definition'} onChange={() => setFcFrontContent('definition')} />
                    Hiển thị định nghĩa
                  </label>
                </div>
                <div className="fc-settings-divider" />
                <div className="fc-settings-group">
                  <span className="fc-settings-label">Cách hiển thị ảnh</span>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcImage" checked={fcImageDisplay === 'definition'} onChange={() => setFcImageDisplay('definition')} />
                    Hiển thị ảnh ở phần định nghĩa
                  </label>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcImage" checked={fcImageDisplay === 'term'} onChange={() => setFcImageDisplay('term')} />
                    Hiển thị ảnh ở phần thuật ngữ
                  </label>
                  <label className="fc-settings-option">
                    <input type="checkbox" checked={fcImageDisplay === 'hidden'} onChange={() => setFcImageDisplay(fcImageDisplay === 'hidden' ? 'definition' : 'hidden')} />
                    Ẩn ảnh
                  </label>
                  <label className="fc-settings-option">
                    <input type="checkbox" checked={fcImageDisplay === 'blurred'} onChange={() => setFcImageDisplay(fcImageDisplay === 'blurred' ? 'definition' : 'blurred')} />
                    Che mờ ảnh
                  </label>
                </div>
                <div className="fc-settings-divider" />
                <div className="fc-settings-group">
                  <span className="fc-settings-label">Kích thước ảnh</span>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcImgSize" checked={fcImageSize === 'small'} onChange={() => setFcImageSize('small')} />
                    Nhỏ
                  </label>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcImgSize" checked={fcImageSize === 'large'} onChange={() => setFcImageSize('large')} />
                    Lớn
                  </label>
                </div>
                <div className="fc-settings-divider" />
                <div className="fc-settings-group">
                  <span className="fc-settings-label">Cách phát âm</span>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcPron" checked={fcPronunciation === 'front'} onChange={() => setFcPronunciation('front')} />
                    Hiển thị mặt trước
                  </label>
                  <label className="fc-settings-option">
                    <input type="radio" name="fcPron" checked={fcPronunciation === 'back'} onChange={() => setFcPronunciation('back')} />
                    Hiển thị mặt sau
                  </label>
                </div>
              </div>
            )}
            <div className="fc-confetti">
              <span className="fc-dot" style={{ background: '#F59E0B', width: 10, height: 10 }} />
              <span className="fc-dot" style={{ background: '#EF4444', width: 7, height: 7 }} />
              <span className="fc-dot" style={{ background: '#3B82F6', width: 8, height: 8 }} />
              <span className="fc-dot" style={{ background: '#22C55E', width: 6, height: 6 }} />
              <span className="fc-dot" style={{ background: '#A855F7', width: 9, height: 9 }} />
              <span className="fc-dot" style={{ background: '#06B6D4', width: 5, height: 5 }} />
              <span className="fc-dot" style={{ background: '#F97316', width: 7, height: 7 }} />
            </div>
            <div className="fc-card-content">
              {showImageOnFront && card.imageUrl && !isImageHidden && (
                <div className={`fc-image-wrapper ${isImageBlurred ? 'fc-image-blurred' : ''}`}>
                  <img src={card.imageUrl} alt="" className={imgSizeClass} />
                </div>
              )}
              <span className="fc-main-text">{frontText}</span>
              {frontSub && <span className="fc-sub-text">{frontSub}</span>}
              <span className="fc-hint-text">{flipHint}</span>
            </div>
            <div className="fc-card-bottom">
              <label className="fc-auto-toggle" onClick={e => e.stopPropagation()} title="Tự động phát âm khi chuyển thẻ">
                <input type="checkbox" checked={fcAutoSpeak} onChange={() => setFcAutoSpeak(a => !a)} />
                <span className="fc-toggle-track"><span className="fc-toggle-thumb" /></span>
              </label>
              <button className="fc-speak-btn" onClick={(e) => { e.stopPropagation(); speakWord(card.word) }} title="Phát âm">
                <SpeakerWaveIcon className="icon" />
              </button>
            </div>
          </div>

          {/* Back */}
          <div className="fc-card fc-card-back">
            <button
              className="fc-settings-btn"
              onClick={(e) => { e.stopPropagation(); setFcShowSettings(s => !s) }}
            >
              <Cog6ToothIcon className="icon" />
            </button>
            <div className="fc-confetti">
              <span className="fc-dot" style={{ background: '#3B82F6', width: 10, height: 10 }} />
              <span className="fc-dot" style={{ background: '#22C55E', width: 8, height: 8 }} />
              <span className="fc-dot" style={{ background: '#F59E0B', width: 6, height: 6 }} />
              <span className="fc-dot" style={{ background: '#EF4444', width: 9, height: 9 }} />
              <span className="fc-dot" style={{ background: '#A855F7', width: 7, height: 7 }} />
            </div>
            <div className="fc-card-content">
              {showImageOnBack && card.imageUrl && !isImageHidden && (
                <div className={`fc-image-wrapper ${isImageBlurred ? 'fc-image-blurred' : ''}`}>
                  <img src={card.imageUrl} alt="" className={imgSizeClass} />
                </div>
              )}
              {isImageBlurred && card.imageUrl && !showImageOnFront && !showImageOnBack && (
                <div className="fc-image-wrapper fc-image-blurred">
                  <img src={card.imageUrl} alt="" className={imgSizeClass} />
                </div>
              )}
              <span className="fc-main-text">{backText}</span>
              {backSub && <span className="fc-sub-text">{backSub}</span>}
              <span className="fc-hint-text">{backHint}</span>
            </div>
            <div className="fc-card-bottom">
              <label className="fc-auto-toggle" onClick={e => e.stopPropagation()} title="Tự động phát âm khi chuyển thẻ">
                <input type="checkbox" checked={fcAutoSpeak} onChange={() => setFcAutoSpeak(a => !a)} />
                <span className="fc-toggle-track"><span className="fc-toggle-thumb" /></span>
              </label>
              <button className="fc-speak-btn" onClick={(e) => { e.stopPropagation(); speakWord(card.word) }}>
                <SpeakerWaveIcon className="icon" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Hints */}
      <p className="fc-keyboard-hint">
        {'Phím tắt: '}<kbd>{'←'}</kbd>{' '}<kbd>{'→'}</kbd>{' để chuyển thẻ · '}<kbd>Space</kbd>{' / '}<kbd>Enter</kbd>{' hoặc click để lật thẻ'}
      </p>

      {/* Navigation */}
      <div className="fc-nav">
        <button
          className={`fc-nav-btn ${fcShuffled ? 'fc-shuffle-active' : ''}`}
          onClick={fcToggleShuffle}
          title={fcShuffled ? 'Tắt trộn' : 'Trộn thẻ'}
        >
          <ArrowsRightLeftIcon className="icon" />
        </button>
        <div className="fc-nav-center">
          <button className="fc-nav-arrow" onClick={fcPrev} disabled={fcIndex <= 0}>
            <ChevronLeftIcon className="icon" />
          </button>
          <span className="fc-nav-counter">
            {'Thẻ ' + (fcIndex + 1) + ' / ' + fcCards.length}
          </span>
          <button className="fc-nav-arrow" onClick={fcNext} disabled={fcIndex >= fcCards.length - 1}>
            <ChevronRightIcon className="icon" />
          </button>
        </div>
        <button className="fc-nav-btn" onClick={() => { setFcIndex(0); setFcFlipped(false) }} title="Về đầu">
          <ArrowPathIcon className="icon" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="fc-progress-bar">
        <div className="fc-progress-fill" style={{ width: `${((fcIndex + 1) / fcCards.length) * 100}%` }} />
      </div>

      {/* Study Guide Link */}
      <div className="fc-study-guide-link">
        <button className="fc-guide-btn" onClick={() => setFcShowStudyGuide(g => !g)}>
          <InformationCircleIcon className="icon" />
          {fcShowStudyGuide ? 'Ẩn hướng dẫn cách học' : 'Xem hướng dẫn cách học'}
        </button>
      </div>

      {/* Study Guide Content */}
      {fcShowStudyGuide && (
        <div className="fc-study-guide">
          <div className="fc-guide-card">
            <h3 className="fc-guide-title">📚 Hướng dẫn học Flash Cards hiệu quả</h3>
            <div className="fc-guide-steps">
              <div className="fc-guide-step">
                <span className="fc-guide-num">1</span>
                <div>
                  <strong>Nhìn mặt trước</strong>
                  <p>Đọc thuật ngữ/định nghĩa và cố gắng nhớ lại nghĩa trước khi lật thẻ.</p>
                </div>
              </div>
              <div className="fc-guide-step">
                <span className="fc-guide-num">2</span>
                <div>
                  <strong>Lật thẻ kiểm tra</strong>
                  <p>Nhấn vào thẻ hoặc dùng phím Space/Enter để xem đáp án.</p>
                </div>
              </div>
              <div className="fc-guide-step">
                <span className="fc-guide-num">3</span>
                <div>
                  <strong>Nghe phát âm</strong>
                  <p>Bật toggle tự động phát âm hoặc nhấn nút loa để luyện nghe.</p>
                </div>
              </div>
              <div className="fc-guide-step">
                <span className="fc-guide-num">4</span>
                <div>
                  <strong>Trộn thẻ</strong>
                  <p>Dùng nút trộn để học ngẫu nhiên, tránh ghi nhớ theo thứ tự.</p>
                </div>
              </div>
            </div>
            <div className="fc-guide-tip">
              💡 <strong>Mẹo:</strong> Học 10-15 thẻ mỗi lần, lặp lại 3-5 lần trong ngày để ghi nhớ tốt nhất.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
