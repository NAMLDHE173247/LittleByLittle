'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import {
  PencilSquareIcon,
  ChevronLeftIcon,
  PlayIcon,
  SpeakerWaveIcon,
  LightBulbIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/AuthContext'
import './WritingMode.css'

// ===== TYPES =====
interface VocabItem {
  _id: string
  word: string
  pronunciation?: string
  meanings: string[]
  partOfSpeech?: string
  examples?: { en: string; vi: string }[]
  imageUrl?: string
  synonyms?: string[]
}

type WordStage = 'type' | 'choice' | 'flashcard' | 'type_retry'

interface WordState {
  vocab: VocabItem
  stage: WordStage
  hintUsed: boolean
}

interface WritingModeProps {
  onExit: () => void
  decks?: any[]
}

const BASE_URL = ''
const PROGRESS_API_URL = `${BASE_URL}/api/progress`

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WritingMode({ onExit, decks = [] }: WritingModeProps) {
  const { authHeaders } = useAuth()

  // ── Setup state ──
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wordCount, setWordCount] = useState(8)
  const [customWordCount, setCustomWordCount] = useState('')
  const [sourceMode, setSourceMode] = useState('lowest_score')
  const [filterDeck, setFilterDeck] = useState('')

  // ── Practice state ──
  const [allWords, setAllWords] = useState<VocabItem[]>([])
  const [queue, setQueue] = useState<WordState[]>([])
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set())
  const [totalWords, setTotalWords] = useState(0)

  // ── Current card state ──
  const [typingInput, setTypingInput] = useState('')
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [showHint, setShowHint] = useState(false)
  const [hintUsedCurrentCard, setHintUsedCurrentCard] = useState(false)

  // ── Choice state ──
  const [choiceOptions, setChoiceOptions] = useState<string[]>([])
  const [choiceSelected, setChoiceSelected] = useState<string | null>(null)

  // Stats
  const [directCorrect, setDirectCorrect] = useState(0)   // gõ đúng ngay lần đầu
  const [withScaffold, setWithScaffold] = useState(0)      // cần hỗ trợ

  const inputRef = useRef<HTMLInputElement>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Speak helper
  const speakWord = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utteranceRef.current = utt
    utt.lang = 'en-US'
    utt.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    const en = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'))
    if (en) utt.voice = en
    window.speechSynthesis.speak(utt)
  }, [])

  // Generate choice options for a word
  const buildChoiceOptions = useCallback((vocab: VocabItem, pool: VocabItem[]) => {
    const correct = vocab.meanings.join(', ')
    const others = pool.filter(w => w._id !== vocab._id).map(w => w.meanings.join(', '))
    const wrongs = shuffleArray(others).slice(0, 3)
    return shuffleArray([correct, ...wrongs])
  }, [])

  // ── START ──
  const startPractice = async () => {
    const count = customWordCount ? parseInt(customWordCount) : wordCount
    if (!count || count < 1) return
    setLoading(true)
    try {
      const url = new URL(`${PROGRESS_API_URL}/practice-words`, window.location.origin)
      url.searchParams.append('count', count.toString())
      url.searchParams.append('mode', sourceMode)
      url.searchParams.append('tier', 'all')
      if (filterDeck) url.searchParams.append('deckId', filterDeck)

      const res = await fetch(url.toString(), { headers: authHeaders() })
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        const words: VocabItem[] = json.data
        setAllWords(words)
        setTotalWords(words.length)
        setPassedIds(new Set())
        setDirectCorrect(0)
        setWithScaffold(0)

        const initialQueue: WordState[] = words.map(v => ({
          vocab: v,
          stage: 'type',
          hintUsed: false,
        }))
        setQueue(initialQueue)
        setTypingInput('')
        setTypingStatus('idle')
        setShowHint(false)
        setHintUsedCurrentCard(false)
        setChoiceOptions(buildChoiceOptions(words[0], words))
        setChoiceSelected(null)
        setStarted(true)
      } else {
        toast.error('Không tìm thấy từ vựng nào phù hợp!')
      }
    } catch {
      toast.error('Lỗi kết nối server!')
    } finally {
      setLoading(false)
    }
  }

  // Current word
  const current = queue[0] ?? null

  // Auto-focus input when stage is type/type_retry
  useEffect(() => {
    if (current && (current.stage === 'type' || current.stage === 'type_retry')) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [current?.vocab._id, current?.stage])

  // Build choice options when entering choice stage
  useEffect(() => {
    if (current?.stage === 'choice' && allWords.length > 0) {
      setChoiceOptions(buildChoiceOptions(current.vocab, allWords))
      setChoiceSelected(null)
    }
  }, [current?.stage, current?.vocab._id])

  // Auto speak on type stage
  useEffect(() => {
    if (current && current.stage === 'type_retry') {
      speakWord(current.vocab.word)
    }
  }, [current?.vocab._id, current?.stage])

  // Submit progress
  const submitProgress = useCallback(async (wordId: string, skill: string, isCorrect: boolean, isHinted = false) => {
    try {
      await fetch(`${PROGRESS_API_URL}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ wordId, skill, correct: isCorrect, isHinted }),
      })
    } catch (e) {
      console.error(e)
    }
  }, [authHeaders])

  // Advance queue: remove front, optionally push to back
  const advance = useCallback((nextQueue: WordState[]) => {
    setQueue(nextQueue)
    setTypingInput('')
    setTypingStatus('idle')
    setShowHint(false)
    setHintUsedCurrentCard(false)
    setChoiceSelected(null)
  }, [])

  // Mark current word as PASSED
  const markPassed = useCallback((isDirect: boolean) => {
    if (!current) return
    const newPassed = new Set(passedIds)
    newPassed.add(current.vocab._id)
    setPassedIds(newPassed)
    if (isDirect) setDirectCorrect(p => p + 1)
    else setWithScaffold(p => p + 1)

    // Confetti milestone
    if (newPassed.size === totalWords) {
      setTimeout(() => confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } }), 300)
    }

    const newQueue = queue.slice(1)
    advance(newQueue)
  }, [current, passedIds, queue, advance, totalWords])

  // ── HANDLE TYPE SUBMIT ──
  const handleTypeSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!current || typingStatus !== 'idle' || !typingInput.trim()) return

    const userAnswer = typingInput.trim().toLowerCase()
    const correct = current.vocab.word.toLowerCase()
    // Also accept synonyms
    const isCorrect = userAnswer === correct ||
      (current.vocab.synonyms || []).some(s => s.toLowerCase() === userAnswer)

    setTypingStatus(isCorrect ? 'correct' : 'incorrect')
    const isFirstTry = current.stage === 'type'
    const isRetry = current.stage === 'type_retry'

    submitProgress(current.vocab._id, 'writing', isCorrect, current.hintUsed || hintUsedCurrentCard)

    if (isCorrect) {
      if (isFirstTry && !hintUsedCurrentCard) {
        toast.success('Xuất sắc! 🎯')
      } else {
        toast.success('Chính xác! 💪')
      }
      setTimeout(() => {
        markPassed(isFirstTry && !hintUsedCurrentCard)
      }, 1200)
    } else {
      // Wrong
      setTimeout(() => {
        if (isFirstTry) {
          // Escalate to choice
          const newQueue: WordState[] = [
            { ...current, stage: 'choice', hintUsed: current.hintUsed || hintUsedCurrentCard },
            ...queue.slice(1)
          ]
          advance(newQueue)
        } else {
          // type_retry failed → push to end of queue
          const rest = queue.slice(1)
          const retried: WordState = { ...current, stage: 'type', hintUsed: false }
          advance([...rest, retried])
          toast.error(`Sai rồi! Đáp án: "${current.vocab.word}". Sẽ hỏi lại sau.`)
        }
      }, 2000)
    }
  }, [current, typingInput, typingStatus, hintUsedCurrentCard, queue, advance, markPassed, submitProgress])

  // ── HANDLE CHOICE SELECT ──
  const handleChoiceSelect = useCallback((option: string) => {
    if (!current || choiceSelected) return
    setChoiceSelected(option)
    const correct = current.vocab.meanings.join(', ')
    const isCorrect = option === correct

    submitProgress(current.vocab._id, 'recall', isCorrect, true)

    setTimeout(() => {
      if (isCorrect) {
        // Move to type_retry
        const newQueue: WordState[] = [
          { ...current, stage: 'type_retry', hintUsed: true },
          ...queue.slice(1)
        ]
        advance(newQueue)
      } else {
        // Move to flashcard
        const newQueue: WordState[] = [
          { ...current, stage: 'flashcard', hintUsed: true },
          ...queue.slice(1)
        ]
        advance(newQueue)
      }
    }, 1500)
  }, [current, choiceSelected, queue, advance, submitProgress])

  // ── HANDLE FLASHCARD CONTINUE ──
  const handleFlashcardContinue = useCallback(() => {
    if (!current) return
    speakWord(current.vocab.word)
    const newQueue: WordState[] = [
      { ...current, stage: 'type_retry', hintUsed: true },
      ...queue.slice(1)
    ]
    advance(newQueue)
  }, [current, queue, advance, speakWord])

  // Keyboard shortcut: Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && current?.stage === 'flashcard') {
        handleFlashcardContinue()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current?.stage, handleFlashcardContinue])

  const progressPct = totalWords > 0 ? (passedIds.size / totalWords) * 100 : 0
  const isComplete = started && queue.length === 0

  // ===== RENDER: SETUP =====
  if (!started) {
    return (
      <div className="writing-container">
        <div className="writing-setup">
          <div className="writing-setup-card">
            <div className="writing-setup-header">
              <div className="writing-setup-icon">
                <PencilSquareIcon className="icon" />
              </div>
              <div>
                <h2 className="writing-setup-title">Writing</h2>
                <p className="writing-setup-subtitle">Kiểm tra trí nhớ thật — hỗ trợ khi cần thiết</p>
              </div>
            </div>

            <div className="writing-setup-body">
              {/* Left col */}
              <div className="writing-setup-section">
                <label className="ws-label">Nguồn từ vựng</label>
                <select className="ws-select" value={sourceMode} onChange={e => setSourceMode(e.target.value)}>
                  <option value="lowest_score">Ưu tiên từ điểm thấp nhất</option>
                  <option value="overdue">Từ đến hạn ôn tập</option>
                  <option value="newest">Từ mới thêm gần đây</option>
                  <option value="oldest">Từ cũ nhất</option>
                  <option value="random">Ngẫu nhiên</option>
                </select>

                <label className="ws-label" style={{ marginTop: 16 }}>Bộ từ vựng (Deck)</label>
                <select className="ws-select" value={filterDeck} onChange={e => setFilterDeck(e.target.value)}>
                  <option value="">Tất cả các bộ</option>
                  {decks.map((d: any) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Right col */}
              <div className="writing-setup-section">
                <label className="ws-label">Số lượng từ</label>
                <div className="ws-count-row">
                  {[4, 8, 12, 20].map(n => (
                    <button
                      key={n}
                      className={`ws-count-btn ${wordCount === n && !customWordCount ? 'active' : ''}`}
                      onClick={() => { setWordCount(n); setCustomWordCount('') }}
                    >
                      {n} từ
                    </button>
                  ))}
                </div>
                <div className="ws-custom-input">
                  <span>Khác:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Nhập số..."
                    value={customWordCount}
                    onChange={e => setCustomWordCount(e.target.value)}
                  />
                </div>

                {/* Flow explanation */}
                <div style={{ marginTop: 20, padding: '14px', background: 'rgba(139,92,246,0.06)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>💡 Cách hoạt động</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Gõ từ tiếng Anh từ nghĩa → Sai? Trắc nghiệm → Vẫn sai? Xem flashcard → Gõ lại
                  </p>
                </div>
              </div>
            </div>

            <div className="writing-setup-footer">
              <button className="ws-start-btn" onClick={startPractice} disabled={loading}>
                {loading ? 'Đang tải...' : 'Bắt đầu Writing'}
                <PlayIcon className="icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: COMPLETE =====
  if (isComplete) {
    const pct = totalWords > 0 ? Math.round((directCorrect / totalWords) * 100) : 0
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
    return (
      <div className="writing-container">
        <div className="writing-complete">
          <div className="wc-card">
            <div className="wc-emoji">{emoji}</div>
            <h2 className="wc-title">Hoàn thành!</h2>
            <p className="wc-subtitle">Bạn đã hoàn thành phiên Writing</p>

            <div className="wc-stats">
              <div className="wc-stat">
                <span className="wc-stat-value green">{directCorrect}</span>
                <span className="wc-stat-label">Đúng ngay</span>
              </div>
              <div className="wc-stat">
                <span className="wc-stat-value" style={{ color: '#f59e0b' }}>{withScaffold}</span>
                <span className="wc-stat-label">Cần hỗ trợ</span>
              </div>
              <div className="wc-stat">
                <span className="wc-stat-value purple">{pct}%</span>
                <span className="wc-stat-label">Thành thạo</span>
              </div>
            </div>

            <div className="wc-actions">
              <button className="wc-btn-primary" onClick={() => {
                setStarted(false)
                setQueue([])
                setPassedIds(new Set())
              }}>
                <ArrowPathIcon style={{ width: 18, height: 18 }} />
                Luyện tập lại
              </button>
              <button className="wc-btn-outline" onClick={onExit}>
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: PRACTICE =====
  if (!current) return null

  const stageLabel = {
    type: { text: '✏️ Gõ từ', cls: 'type' },
    choice: { text: '🔤 Chọn nghĩa', cls: 'choice' },
    flashcard: { text: '📖 Xem flashcard', cls: 'flashcard' },
    type_retry: { text: '✏️ Gõ lại', cls: 'retry' },
  }[current.stage]

  return (
    <div className="writing-container">
      <div className="writing-practice">
        {/* Top bar */}
        <div className="wp-topbar">
          <button className="wp-exit-btn" onClick={() => setStarted(false)}>
            <ChevronLeftIcon className="icon" />
            Thoát
          </button>
          <div className="wp-progress-wrap">
            <div className="wp-progress-bar">
              <div className="wp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="wp-progress-text">{passedIds.size}/{totalWords} từ hoàn thành</div>
          </div>
        </div>

        {/* Stage badge */}
        <div className={`wp-stage-badge ${stageLabel.cls}`}>
          {stageLabel.text}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${current.vocab._id}-${current.stage}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="wp-card"
          >

            {/* ── TYPE / TYPE_RETRY ── */}
            {(current.stage === 'type' || current.stage === 'type_retry') && (
              <>
                <div className="wp-type-header">
                  <div className="wp-type-label">
                    {current.stage === 'type_retry' ? 'Thử lại — gõ từ tiếng Anh:' : 'Từ tiếng Anh có nghĩa là:'}
                  </div>
                  <div className="wp-type-meaning">"{current.vocab.meanings.join(', ')}"</div>
                </div>

                {current.stage === 'type_retry' && (
                  <div style={{ textAlign: 'center', marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
                    Phiên âm: <strong>{current.vocab.pronunciation || '—'}</strong>
                  </div>
                )}

                <div className="wp-type-hint">
                  <button
                    className={`wp-hint-btn ${hintUsedCurrentCard ? 'used' : ''}`}
                    onClick={() => {
                      setHintUsedCurrentCard(true)
                      setShowHint(true)
                    }}
                  >
                    <LightBulbIcon className="icon" />
                    Gợi ý chữ
                  </button>
                  <button
                    className={`wp-hint-btn ${hintUsedCurrentCard ? 'used' : ''}`}
                    onClick={() => {
                      setHintUsedCurrentCard(true)
                      speakWord(current.vocab.word)
                    }}
                  >
                    <SpeakerWaveIcon className="icon" />
                    Nghe gợi ý
                  </button>
                </div>

                {showHint && typingStatus === 'idle' && (
                  <div className="wp-hint-text">
                    Từ này bắt đầu bằng: <strong>{current.vocab.word.slice(0, 2)}...</strong>
                    {current.vocab.word.length > 4 && ` (${current.vocab.word.length} chữ cái)`}
                  </div>
                )}

                <form className="wp-type-form" onSubmit={handleTypeSubmit}>
                  <input
                    ref={inputRef}
                    type="text"
                    className={`wp-type-input ${typingStatus !== 'idle' ? typingStatus : ''}`}
                    placeholder="Gõ từ tiếng Anh..."
                    value={typingInput}
                    onChange={e => setTypingInput(e.target.value)}
                    disabled={typingStatus !== 'idle'}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {typingStatus === 'correct' && (
                    <div className="wp-feedback correct">✓ Chính xác! 🎯</div>
                  )}
                  {typingStatus === 'incorrect' && (
                    <div className="wp-feedback incorrect">
                      ✗ Sai rồi! Đáp án: <strong>{current.vocab.word}</strong>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="wp-submit-btn"
                    disabled={typingStatus !== 'idle' || !typingInput.trim()}
                  >
                    Kiểm tra
                  </button>
                </form>
              </>
            )}

            {/* ── CHOICE ── */}
            {current.stage === 'choice' && (
              <>
                <div className="wp-choice-header">
                  <div className="wp-choice-word">{current.vocab.word}</div>
                  {current.vocab.pronunciation && (
                    <div className="wp-choice-pron">/{current.vocab.pronunciation}/</div>
                  )}
                  <button className="wp-speak-btn" onClick={() => speakWord(current.vocab.word)}>
                    <SpeakerWaveIcon className="icon" />
                    Nghe phát âm
                  </button>
                  <div className="wp-choice-prompt">Từ này có nghĩa là gì?</div>
                </div>

                <div className="wp-options">
                  {choiceOptions.map((opt, i) => {
                    const correct = current.vocab.meanings.join(', ')
                    let cls = 'wp-option-btn'
                    if (choiceSelected) {
                      if (opt === correct) cls += ' correct'
                      else if (opt === choiceSelected) cls += ' incorrect'
                      else cls += ' disabled'
                    }
                    return (
                      <button
                        key={i}
                        className={cls}
                        onClick={() => handleChoiceSelect(opt)}
                        disabled={!!choiceSelected}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {choiceSelected && (
                  <div className="wp-feedback" style={{ marginTop: 16, textAlign: 'center' }}>
                    {choiceSelected === current.vocab.meanings.join(', ')
                      ? <span className="wp-feedback correct">✓ Đúng! Bây giờ hãy gõ từ này.</span>
                      : <span className="wp-feedback incorrect">✗ Sai! Hãy xem flashcard để học lại.</span>
                    }
                  </div>
                )}
              </>
            )}

            {/* ── FLASHCARD ── */}
            {current.stage === 'flashcard' && (
              <div className="wp-fc-card">
                {current.vocab.imageUrl && (
                  <img src={current.vocab.imageUrl} className="wp-fc-image" alt="" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="wp-fc-word-row">
                  <div className="wp-fc-word">{current.vocab.word}</div>
                  <button className="wp-speak-btn" onClick={() => speakWord(current.vocab.word)}>
                    <SpeakerWaveIcon className="icon" />
                  </button>
                </div>
                {current.vocab.pronunciation && (
                  <div className="wp-fc-pron">/{current.vocab.pronunciation}/</div>
                )}
                <div className="wp-fc-meaning">{current.vocab.meanings.join(', ')}</div>

                {current.vocab.examples && current.vocab.examples.length > 0 && (
                  <div className="wp-fc-examples">
                    {current.vocab.examples.slice(0, 2).map((ex, i) => (
                      <div key={i} className="wp-fc-example">
                        <p className="en">{ex.en}</p>
                        <p className="vi">{ex.vi}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button className="wp-fc-continue" onClick={handleFlashcardContinue}>
                  <PlayIcon className="icon" />
                  Đã nhớ rồi, thử gõ lại
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Queue counter */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
          Còn lại trong hàng đợi: {queue.length} từ
        </div>
      </div>
    </div>
  )
}
