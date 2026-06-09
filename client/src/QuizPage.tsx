import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  ChevronLeftIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  StarIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

// ===== TYPES =====
interface DeckRef {
  _id: string
  name: string
  color: string
}

interface DeckItem {
  _id: string
  name: string
  description: string
  color: string
  wordCount: number
  createdAt: string
}

interface VocabularyItem {
  _id: string
  word: string
  type: 'word' | 'phrase'
  pronunciation: string
  meanings: string[]
  partOfSpeech: string
  examples: { en: string; vi: string }[]
  topic: string
  level: string
  synonyms: string[]
  antonyms: string[]
  note: string
  imageUrl: string
  deckIds: DeckRef[]
  createdAt: string
}

type QuizMode = 'en2vi' | 'vi2en'
type QuestionType = 'multiple' | 'fill' | 'listen'

interface QuizSettings {
  mode: QuizMode
  questionTypes: QuestionType[]
  questionCount: number
  shuffle: boolean
  autoNext: boolean
  filterDeck: string
  filterLevel: string
  filterTopic: string
  filterPOS: string
  filterStarredOnly: boolean
}

interface QuizQuestion {
  vocab: VocabularyItem
  type: QuestionType
  questionText: string
  correctAnswer: string
  options: string[] // for multiple/listen
  correctIdx: number
}

interface QuizPageProps {
  vocabularies: VocabularyItem[]
  decks: DeckItem[]
  onExit: () => void
  onEditWord: (vocab: VocabularyItem) => void
  speak: (word: string) => void
}

// ===== HELPERS =====
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(
  words: VocabularyItem[],
  settings: QuizSettings,
): QuizQuestion[] {
  const pool = settings.shuffle ? shuffleArray(words) : [...words]
  const count = Math.min(settings.questionCount, pool.length)
  const selected = pool.slice(0, count)
  const types = settings.questionTypes.length > 0
    ? settings.questionTypes
    : ['multiple' as QuestionType]

  return selected.map((vocab, idx) => {
    // Pick a random question type from enabled types
    const type = types[idx % types.length]

    const questionText = settings.mode === 'en2vi'
      ? vocab.word
      : vocab.meanings.join(', ')

    const correctAnswer = settings.mode === 'en2vi'
      ? vocab.meanings.join(', ')
      : vocab.word

    // Build 4 options for multiple/listen
    let options: string[] = []
    let correctIdx = 0

    if (type === 'multiple' || type === 'listen') {
      const others = words.filter(w => w._id !== vocab._id)
      const picked = shuffleArray(others).slice(0, 3)
      const wrongs = picked.map(w =>
        settings.mode === 'en2vi' ? w.meanings.join(', ') : w.word
      )
      // Place correct answer at random position
      correctIdx = Math.floor(Math.random() * 4)
      let wi = 0
      for (let i = 0; i < 4; i++) {
        if (i === correctIdx) options.push(correctAnswer)
        else { options.push(wrongs[wi] || '—'); wi++ }
      }
    }

    return { vocab, type, questionText, correctAnswer, options, correctIdx }
  })
}

// ===== DEFAULT SETTINGS =====
const defaultSettings: QuizSettings = {
  mode: 'en2vi',
  questionTypes: ['multiple'],
  questionCount: 999,
  shuffle: true,
  autoNext: true,
  filterDeck: '',
  filterLevel: '',
  filterTopic: '',
  filterPOS: '',
  filterStarredOnly: false,
}

// ===== COMPONENT =====
export default function QuizPage({ vocabularies, decks, onExit, onEditWord, speak }: QuizPageProps) {
  const [settings, setSettings] = useState<QuizSettings>({ ...defaultSettings })
  const [showSettings, setShowSettings] = useState(false)
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [starred, setStarred] = useState<Set<number>>(new Set())
  const [fillInput, setFillInput] = useState('')
  const [fillCorrect, setFillCorrect] = useState<boolean | null>(null)
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([])
  const [showReview, setShowReview] = useState(false)

  const fillInputRef = useRef<HTMLInputElement>(null)
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive filtered words
  const filteredWords = vocabularies.filter(v => {
    if (v.meanings.length === 0) return false
    if (settings.filterDeck && !v.deckIds.some(d => d._id === settings.filterDeck)) return false
    if (settings.filterLevel && v.level !== settings.filterLevel) return false
    if (settings.filterTopic && v.topic !== settings.filterTopic) return false
    if (settings.filterPOS && v.partOfSpeech !== settings.filterPOS) return false
    if (settings.filterStarredOnly && !starred.has(vocabularies.indexOf(v))) return false
    return true
  })

  // Unique values for filters
  const uniqueLevels = [...new Set(vocabularies.map(v => v.level).filter(Boolean))].sort()
  const uniqueTopics = [...new Set(vocabularies.map(v => v.topic).filter(Boolean))].sort()
  const uniquePOS = [...new Set(vocabularies.map(v => v.partOfSpeech).filter(Boolean))].sort()

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (autoNextTimer.current) clearTimeout(autoNextTimer.current) }
  }, [])

  // Auto-speak for listen mode
  useEffect(() => {
    if (started && questions[currentIdx]?.type === 'listen' && !answered) {
      const q = questions[currentIdx]
      speak(q.vocab.word)
    }
  }, [currentIdx, started, questions])

  // Focus fill input
  useEffect(() => {
    if (started && questions[currentIdx]?.type === 'fill' && !answered) {
      setTimeout(() => fillInputRef.current?.focus(), 100)
    }
  }, [currentIdx, started, questions, answered])

  const startQuiz = useCallback(() => {
    if (filteredWords.length < 4 && settings.questionTypes.some(t => t !== 'fill')) {
      // Need at least 4 words for multiple choice
      // If only fill mode, need at least 1
      if (filteredWords.length < 1) return
    }
    if (filteredWords.length < 1) return

    const effectiveCount = settings.questionCount > filteredWords.length
      ? filteredWords.length
      : settings.questionCount

    const qs = buildQuestions(filteredWords, { ...settings, questionCount: effectiveCount })
    setQuestions(qs)
    setCurrentIdx(0)
    setSelected(null)
    setAnswered(false)
    setCorrectCount(0)
    setTotalAnswered(0)
    setFillInput('')
    setFillCorrect(null)
    setWrongAnswers([])
    setShowReview(false)
    setStarted(true)
  }, [filteredWords, settings])

  const handleRestart = () => {
    setStarted(false)
    setCurrentIdx(0)
    setSelected(null)
    setAnswered(false)
    setCorrectCount(0)
    setTotalAnswered(0)
    setFillInput('')
    setFillCorrect(null)
    setWrongAnswers([])
    setShowReview(false)
  }

  const goNext = useCallback(() => {
    if (autoNextTimer.current) clearTimeout(autoNextTimer.current)
    setCurrentIdx(prev => prev + 1)
    setSelected(null)
    setAnswered(false)
    setFillInput('')
    setFillCorrect(null)
  }, [])

  const scheduleAutoNext = useCallback(() => {
    if (settings.autoNext) {
      autoNextTimer.current = setTimeout(goNext, 1200)
    }
  }, [settings.autoNext, goNext])

  // ---- Multiple Choice Handler ----
  const handleSelect = (idx: number) => {
    if (answered) return
    const q = questions[currentIdx]
    setSelected(idx)
    setAnswered(true)
    setTotalAnswered(prev => prev + 1)
    if (idx === q.correctIdx) {
      setCorrectCount(prev => prev + 1)
      scheduleAutoNext()
    } else {
      setWrongAnswers(prev => [...prev, currentIdx])
    }
  }

  // ---- Don't Know Handler ----
  const handleDontKnow = () => {
    if (answered) return
    setSelected(-1)
    setAnswered(true)
    setTotalAnswered(prev => prev + 1)
    setWrongAnswers(prev => [...prev, currentIdx])
  }

  // ---- Fill-in-blank Handler ----
  const handleFillSubmit = () => {
    if (answered || !fillInput.trim()) return
    const q = questions[currentIdx]
    const userAnswer = fillInput.trim().toLowerCase()
    const correct = q.correctAnswer.toLowerCase()
    // Also check individual meanings for en2vi
    let isCorrect = userAnswer === correct
    if (!isCorrect && settings.mode === 'en2vi') {
      isCorrect = q.vocab.meanings.some(m => m.toLowerCase() === userAnswer)
    }
    if (!isCorrect && settings.mode === 'vi2en') {
      // Check synonyms too
      isCorrect = q.vocab.synonyms.some(s => s.toLowerCase() === userAnswer)
    }

    setFillCorrect(isCorrect)
    setAnswered(true)
    setTotalAnswered(prev => prev + 1)
    if (isCorrect) {
      setCorrectCount(prev => prev + 1)
      scheduleAutoNext()
    } else {
      setWrongAnswers(prev => [...prev, currentIdx])
    }
  }

  // ---- Star toggle ----
  const toggleStar = () => {
    setStarred(prev => {
      const next = new Set(prev)
      const globalIdx = vocabularies.indexOf(questions[currentIdx]?.vocab)
      if (globalIdx >= 0) {
        if (next.has(globalIdx)) next.delete(globalIdx)
        else next.add(globalIdx)
      }
      return next
    })
  }

  const toggleQuestionType = (type: QuestionType) => {
    setSettings(prev => {
      const types = prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
      return { ...prev, questionTypes: types.length > 0 ? types : [type] }
    })
  }

  // ===== RENDER: Not enough words =====
  if (vocabularies.filter(v => v.meanings.length > 0).length < 1) {
    return (
      <div className="proficiency-empty">
        <QuestionMarkCircleIcon className="icon" style={{ width: 48, height: 48, opacity: 0.3 }} />
        <p>Cần ít nhất 1 từ vựng để bắt đầu quiz.</p>
        <p className="text-muted" style={{ fontSize: 13 }}>Thêm từ vựng ở trang Từ vựng.</p>
      </div>
    )
  }

  // ===== RENDER: Review Wrong Answers =====
  if (showReview) {
    const wrongQs = wrongAnswers.map(i => questions[i]).filter(Boolean)
    return (
      <div className="quiz-container">
        <div className="quiz-topbar">
          <button className="quiz-exit-btn" onClick={() => setShowReview(false)}>
            <ChevronLeftIcon className="icon" /> Quay lại
          </button>
        </div>
        <div className="quiz-review-card">
          <h2 className="quiz-review-title">📝 Các từ cần ôn tập ({wrongQs.length})</h2>
          <div className="quiz-review-list">
            {wrongQs.map((q, i) => (
              <div key={i} className="quiz-review-item">
                <div className="quiz-review-word">
                  <strong>{q.vocab.word}</strong>
                  {q.vocab.pronunciation && <span className="quiz-review-pron">{q.vocab.pronunciation}</span>}
                  <button className="quiz-action-icon" onClick={() => speak(q.vocab.word)}>
                    <SpeakerWaveIcon className="icon" />
                  </button>
                </div>
                <div className="quiz-review-meaning">{q.vocab.meanings.join(', ')}</div>
                {q.vocab.imageUrl && (
                  <img src={q.vocab.imageUrl} alt="" className="quiz-review-img" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
            ))}
          </div>
          <div className="quiz-review-actions">
            <button className="btn-primary" onClick={handleRestart}>
              <ArrowPathIcon className="icon icon-inline" /> Làm lại Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: Completion Screen =====
  if (started && currentIdx >= questions.length) {
    const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'
    return (
      <div className="quiz-complete">
        <div className="quiz-complete-card">
          <div className="quiz-complete-icon">{emoji}</div>
          <h2>Hoàn thành!</h2>
          <p className="quiz-complete-subtitle">Bạn đã hoàn thành bài quiz</p>
          <div className="quiz-complete-stats">
            <div className="quiz-stat-item">
              <span className="quiz-stat-value quiz-stat-correct">{correctCount}</span>
              <span className="quiz-stat-label">Đúng</span>
            </div>
            <div className="quiz-stat-divider" />
            <div className="quiz-stat-item">
              <span className="quiz-stat-value quiz-stat-wrong">{totalAnswered - correctCount}</span>
              <span className="quiz-stat-label">Sai</span>
            </div>
            <div className="quiz-stat-divider" />
            <div className="quiz-stat-item">
              <span className="quiz-stat-value">{pct}%</span>
              <span className="quiz-stat-label">Tỉ lệ đúng</span>
            </div>
          </div>
          <div className="quiz-complete-actions">
            <button className="btn-primary" onClick={handleRestart}>
              <ArrowPathIcon className="icon icon-inline" /> Làm lại
            </button>
            {wrongAnswers.length > 0 && (
              <button className="btn-outline" onClick={() => setShowReview(true)}>
                <EyeIcon className="icon icon-inline" /> Xem từ sai ({wrongAnswers.length})
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: Start Screen =====
  if (!started) {
    const availableCount = filteredWords.length
    const needsMultiple = settings.questionTypes.some(t => t !== 'fill')
    const canStart = needsMultiple ? availableCount >= 4 : availableCount >= 1

    return (
      <div className="quiz-start">
        <div className="quiz-start-card">
          <div className="quiz-start-icon">
            <QuestionMarkCircleIcon className="icon" />
          </div>
          <h2>Quiz từ vựng</h2>
          <p className="quiz-start-subtitle">Luyện tập kiến thức từ vựng qua nhiều chế độ câu hỏi</p>
          <div className="quiz-start-info">
            <div className="quiz-info-item">
              <span className="quiz-info-num">{availableCount}</span>
              <span className="quiz-info-label">từ khả dụng</span>
            </div>
            <div className="quiz-info-item">
              <span className="quiz-info-num">
                {Math.min(settings.questionCount, availableCount)}
              </span>
              <span className="quiz-info-label">câu hỏi</span>
            </div>
            <div className="quiz-info-item">
              <span className="quiz-info-num">{settings.questionTypes.length}</span>
              <span className="quiz-info-label">chế độ</span>
            </div>
          </div>

          {!canStart && (
            <p className="quiz-warning">
              ⚠ Cần ít nhất {needsMultiple ? 4 : 1} từ vựng{settings.filterDeck || settings.filterLevel || settings.filterTopic || settings.filterPOS ? ' (thử bỏ bộ lọc)' : ''}.
            </p>
          )}

          <div className="quiz-start-actions">
            <button className="btn-primary quiz-start-btn" onClick={startQuiz} disabled={!canStart}>
              Bắt đầu Quiz
            </button>
            <button className="btn-outline" onClick={() => setShowSettings(true)}>
              <Cog6ToothIcon className="icon icon-inline" /> Cài đặt
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {renderSettingsModal()}
      </div>
    )
  }

  // ===== RENDER: Active Question =====
  const q = questions[currentIdx]
  const isStarred = starred.has(vocabularies.indexOf(q.vocab))

  function renderQuestion() {
    if (q.type === 'fill') return renderFillQuestion()
    if (q.type === 'listen') return renderListenQuestion()
    return renderMultipleQuestion()
  }

  function renderMultipleQuestion() {
    return (
      <>
        <div className="quiz-options">
          {q.options.map((opt, idx) => {
            let cls = 'quiz-option'
            if (answered) {
              if (idx === q.correctIdx) cls += ' correct'
              else if (idx === selected) cls += ' wrong'
              else cls += ' disabled'
            }
            return (
              <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={answered}>
                <span className="quiz-option-num">{idx + 1}</span>
                <span className="quiz-option-text">{opt}</span>
                {answered && idx === q.correctIdx && <CheckIcon className="icon quiz-check-icon" />}
                {answered && idx === selected && idx !== q.correctIdx && <XMarkIcon className="icon quiz-x-icon" />}
              </button>
            )
          })}
        </div>
        {!answered && (
          <button className="quiz-dont-know" onClick={handleDontKnow}>
            5. Tôi không biết
          </button>
        )}
      </>
    )
  }

  function renderFillQuestion() {
    return (
      <div className="quiz-fill-container">
        <div className="quiz-fill-input-wrap">
          <input
            ref={fillInputRef}
            type="text"
            className={`quiz-fill-input ${fillCorrect === true ? 'correct' : fillCorrect === false ? 'wrong' : ''}`}
            placeholder={settings.mode === 'en2vi' ? 'Nhập nghĩa tiếng Việt...' : 'Nhập từ tiếng Anh...'}
            value={fillInput}
            onChange={e => setFillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleFillSubmit() }}
            disabled={answered}
            autoComplete="off"
            spellCheck={false}
          />
          {!answered && (
            <button className="quiz-fill-submit" onClick={handleFillSubmit} disabled={!fillInput.trim()}>
              Kiểm tra
            </button>
          )}
        </div>
        {answered && fillCorrect === true && (
          <div className="quiz-fill-feedback correct">
            <CheckIcon className="icon" /> Chính xác!
          </div>
        )}
        {answered && fillCorrect === false && (
          <div className="quiz-fill-feedback wrong">
            <XMarkIcon className="icon" /> Sai rồi! Đáp án đúng: <strong>{q.correctAnswer}</strong>
          </div>
        )}
        {!answered && (
          <button className="quiz-dont-know" onClick={handleDontKnow} style={{ marginTop: 12 }}>
            Tôi không biết
          </button>
        )}
      </div>
    )
  }

  function renderListenQuestion() {
    return (
      <>
        <div className="quiz-listen-prompt">
          <button className="quiz-listen-replay" onClick={() => speak(q.vocab.word)}>
            <SpeakerWaveIcon className="icon" />
            <span>Nghe lại</span>
          </button>
          <p className="quiz-listen-hint">Nghe phát âm và chọn đáp án đúng</p>
        </div>
        <div className="quiz-options">
          {q.options.map((opt, idx) => {
            let cls = 'quiz-option'
            if (answered) {
              if (idx === q.correctIdx) cls += ' correct'
              else if (idx === selected) cls += ' wrong'
              else cls += ' disabled'
            }
            return (
              <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={answered}>
                <span className="quiz-option-num">{idx + 1}</span>
                <span className="quiz-option-text">{opt}</span>
                {answered && idx === q.correctIdx && <CheckIcon className="icon quiz-check-icon" />}
                {answered && idx === selected && idx !== q.correctIdx && <XMarkIcon className="icon quiz-x-icon" />}
              </button>
            )
          })}
        </div>
        {!answered && (
          <button className="quiz-dont-know" onClick={handleDontKnow}>
            5. Tôi không biết
          </button>
        )}
      </>
    )
  }

  function renderFeedback() {
    if (!answered) return null
    // For fill mode, feedback is inline
    if (q.type === 'fill' && fillCorrect !== null) return null

    const isCorrect = q.type === 'multiple' || q.type === 'listen'
      ? selected === q.correctIdx
      : fillCorrect === true

    if (isCorrect && settings.autoNext) return null // auto-next will handle

    return (
      <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : ''}`}>
        {q.vocab.imageUrl && (
          <div className="quiz-feedback-image">
            <img src={q.vocab.imageUrl} alt="" onError={e => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        <p className="quiz-feedback-text" style={isCorrect ? { color: '#22C55E' } : undefined}>
          {isCorrect ? '✓ Chính xác!' : <>Đáp án đúng là: <strong>
            {settings.mode === 'en2vi' ? q.vocab.meanings.join(', ') : q.vocab.word}
          </strong></>}
        </p>
        <button className="quiz-continue-btn" onClick={goNext}>
          Tiếp tục
        </button>
      </div>
    )
  }

  function renderSettingsModal() {
    if (!showSettings) return null
    return (
      <div className="modal-overlay" onClick={() => setShowSettings(false)}>
        <div className="modal quiz-settings-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Cài đặt Quiz</h2>
            <button className="modal-close" onClick={() => setShowSettings(false)}>
              <XMarkIcon className="icon" />
            </button>
          </div>
          <div className="modal-body">
            <p className="quiz-settings-subtitle">Tùy chỉnh cách bạn muốn luyện tập</p>

            {/* Answer Mode */}
            <div className="quiz-settings-section">
              <h4>Hướng hỏi</h4>
              <label className={`quiz-setting-option ${settings.mode === 'en2vi' ? 'active' : ''}`}>
                <input type="radio" name="qMode" checked={settings.mode === 'en2vi'}
                  onChange={() => setSettings(s => ({ ...s, mode: 'en2vi' }))} />
                <span>Hỏi tiếng Anh → trả lời tiếng Việt</span>
              </label>
              <label className={`quiz-setting-option ${settings.mode === 'vi2en' ? 'active' : ''}`}>
                <input type="radio" name="qMode" checked={settings.mode === 'vi2en'}
                  onChange={() => setSettings(s => ({ ...s, mode: 'vi2en' }))} />
                <span>Hỏi tiếng Việt → trả lời tiếng Anh</span>
              </label>
            </div>

            {/* Question Types */}
            <div className="quiz-settings-section">
              <h4>Loại câu hỏi <span className="quiz-setting-badge">{settings.questionTypes.length} đang bật</span></h4>
              <label className={`quiz-setting-option ${settings.questionTypes.includes('multiple') ? 'active' : ''}`}>
                <input type="checkbox" checked={settings.questionTypes.includes('multiple')}
                  onChange={() => toggleQuestionType('multiple')} />
                <span>📋 Trắc nghiệm 4 đáp án</span>
              </label>
              <label className={`quiz-setting-option ${settings.questionTypes.includes('fill') ? 'active' : ''}`}>
                <input type="checkbox" checked={settings.questionTypes.includes('fill')}
                  onChange={() => toggleQuestionType('fill')} />
                <span>✏️ Điền từ (Fill in the blank)</span>
              </label>
              <label className={`quiz-setting-option ${settings.questionTypes.includes('listen') ? 'active' : ''}`}>
                <input type="checkbox" checked={settings.questionTypes.includes('listen')}
                  onChange={() => toggleQuestionType('listen')} />
                <span>🎧 Nghe chọn đáp án</span>
              </label>
              <p className="quiz-setting-hint">* Khi chọn nhiều loại, câu hỏi sẽ xen kẽ các chế độ</p>
            </div>

            {/* Filters */}
            <div className="quiz-settings-section">
              <h4>Lọc từ vựng</h4>
              <div className="quiz-filter-grid">
                <div className="quiz-filter-item">
                  <label>Bộ thẻ</label>
                  <select value={settings.filterDeck} onChange={e => setSettings(s => ({ ...s, filterDeck: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {decks.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="quiz-filter-item">
                  <label>Cấp độ</label>
                  <select value={settings.filterLevel} onChange={e => setSettings(s => ({ ...s, filterLevel: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {uniqueLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="quiz-filter-item">
                  <label>Chủ đề</label>
                  <select value={settings.filterTopic} onChange={e => setSettings(s => ({ ...s, filterTopic: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {uniqueTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="quiz-filter-item">
                  <label>Từ loại</label>
                  <select value={settings.filterPOS} onChange={e => setSettings(s => ({ ...s, filterPOS: e.target.value }))}>
                    <option value="">Tất cả</option>
                    {uniquePOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <label className={`quiz-setting-option ${settings.filterStarredOnly ? 'active' : ''}`} style={{ marginTop: 8 }}>
                <input type="checkbox" checked={settings.filterStarredOnly}
                  onChange={() => setSettings(s => ({ ...s, filterStarredOnly: !s.filterStarredOnly }))} />
                <span>⭐ Chỉ từ đánh dấu sao ({starred.size})</span>
              </label>
              <p className="quiz-setting-hint">Từ khả dụng: <strong>{filteredWords.length}</strong></p>
            </div>

            {/* Question Count */}
            <div className="quiz-settings-section">
              <h4>Số câu hỏi</h4>
              <div className="quiz-count-input">
                <input
                  type="number"
                  min={1}
                  max={filteredWords.length}
                  value={settings.questionCount > filteredWords.length ? filteredWords.length : settings.questionCount}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 1
                    setSettings(s => ({ ...s, questionCount: Math.max(1, val) }))
                  }}
                />
                <span className="quiz-count-max">/ {filteredWords.length} từ</span>
              </div>
              <div className="quiz-count-presets">
                {[10, 20, 30, 50].map(n => (
                  <button
                    key={n}
                    className={`quiz-count-preset ${settings.questionCount === n ? 'active' : ''}`}
                    onClick={() => setSettings(s => ({ ...s, questionCount: n }))}
                    disabled={n > filteredWords.length}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className={`quiz-count-preset ${settings.questionCount >= filteredWords.length ? 'active' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, questionCount: filteredWords.length }))}
                >
                  Tất cả
                </button>
              </div>
            </div>

            {/* Behavior */}
            <div className="quiz-settings-section">
              <h4>Tùy chọn khác</h4>
              <label className={`quiz-setting-option ${settings.shuffle ? 'active' : ''}`}>
                <input type="checkbox" checked={settings.shuffle}
                  onChange={() => setSettings(s => ({ ...s, shuffle: !s.shuffle }))} />
                <span>🔀 Xáo trộn câu hỏi</span>
              </label>
              <label className={`quiz-setting-option ${settings.autoNext ? 'active' : ''}`}>
                <input type="checkbox" checked={settings.autoNext}
                  onChange={() => setSettings(s => ({ ...s, autoNext: !s.autoNext }))} />
                <span>⏩ Tự động chuyển câu khi đúng</span>
              </label>
            </div>
          </div>
          <div className="modal-footer quiz-settings-footer">
            <button className="btn-outline quiz-reset-btn" onClick={() => {
              setSettings({ ...defaultSettings })
            }} style={{ color: '#EF4444' }}>
              <ArrowPathIcon className="icon icon-inline" /> Đặt lại mặc định
            </button>
            <button className="btn-primary" onClick={() => setShowSettings(false)}>
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ===== MAIN QUIZ VIEW =====
  return (
    <div className="quiz-container">
      {/* Quiz Top Bar */}
      <div className="quiz-topbar">
        <button className="quiz-exit-btn" onClick={handleRestart}>
          <ChevronLeftIcon className="icon" /> Thoát
        </button>
        <div className="quiz-topbar-center">
          <span className="quiz-mode-badge">
            {q.type === 'multiple' ? '📋 Trắc nghiệm' : q.type === 'fill' ? '✏️ Điền từ' : '🎧 Nghe'}
          </span>
        </div>
        <button className="quiz-settings-btn" onClick={() => setShowSettings(true)}>
          <Cog6ToothIcon className="icon" /> Cài đặt
        </button>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress-bar">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`quiz-progress-segment ${
              i < currentIdx ? 'completed' :
              i === currentIdx ? 'current' : ''
            }`}
          />
        ))}
      </div>

      {/* Quiz Card */}
      <div className="quiz-card">
        {/* Question Header */}
        <div className="quiz-question-header">
          <div className="quiz-question-text">
            {q.type === 'listen' ? (
              <h2 className="quiz-word quiz-listen-word">
                <SpeakerWaveIcon className="icon" style={{ width: 32, height: 32 }} />
                {answered ? q.vocab.word : '🔊 ???'}
              </h2>
            ) : (
              <h2 className="quiz-word">{q.questionText}</h2>
            )}
            {q.type !== 'listen' && q.vocab.type && (
              <span className="quiz-word-meta">
                {q.vocab.type}
                {q.vocab.pronunciation && ` - ${q.vocab.pronunciation}`}
              </span>
            )}
          </div>
          <div className="quiz-question-actions">
            {q.type !== 'listen' && (
              <button className="quiz-action-icon" onClick={() => speak(q.vocab.word)} title="Phát âm">
                <SpeakerWaveIcon className="icon" />
              </button>
            )}
            <button
              className={`quiz-action-icon ${isStarred ? 'starred' : ''}`}
              onClick={toggleStar}
              title="Đánh dấu"
            >
              <StarIcon className="icon" />
            </button>
            <button className="quiz-action-icon" title="Chỉnh sửa" onClick={() => onEditWord(q.vocab)}>
              <PencilSquareIcon className="icon" />
            </button>
          </div>
        </div>

        {/* Question Content */}
        {renderQuestion()}

        {/* Feedback */}
        {renderFeedback()}
      </div>

      {/* Bottom Stats */}
      <div className="quiz-bottom-stats">
        <span>Đã hoàn thành: {correctCount} / {questions.length}</span>
        <span>•</span>
        <span>Câu hỏi: {currentIdx + 1} / {questions.length}</span>
      </div>

      {/* Settings Modal */}
      {renderSettingsModal()}
    </div>
  )
}
