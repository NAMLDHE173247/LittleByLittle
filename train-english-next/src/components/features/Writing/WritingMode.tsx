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
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/AuthContext'
import { checkAnswer, formatForDisplay, normalizeForComparison } from '@/lib/utils/answerUtils'
import WritingPreviewTable from './WritingPreviewTable'
import './WritingMode.css'

// ===== TYPES =====
interface VocabItem {
  _id?: string
  id?: string
  wordId?: string
  word: string
  pronunciation?: string
  meanings: string[]
  partOfSpeech?: string
  examples?: { en: string; vi: string }[]
  imageUrl?: string
  synonyms?: string[]
}

type WordStage = 'type' | 'choice' | 'flashcard' | 'type_retry'

type TypingPhase =
  | 'answering'      // nhập bình thường
  | 'feedback_ok'    // vừa đúng, đang hiện toast/animation
  | 'feedback_fail'  // vừa sai, hiện đáp án đúng
  | 'correcting'     // bắt gõ lại đáp án đúng
  | 'done'           // từ hoàn tất, đang advance

interface WordState {
  vocab: VocabItem
  stage: WordStage
  hintLevel: number    // 0–4
}

interface WritingModeProps {
  onExit: () => void
  decks?: any[]
  initialWords?: VocabItem[]
}

const BASE_URL = ''
const PROGRESS_API_URL = `${BASE_URL}/api/progress`

// ===== HELPERS =====
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getWordId(vocab: VocabItem): string {
  return vocab._id ?? vocab.id ?? vocab.wordId ?? ''
}

function getValidAnswers(vocab: VocabItem): string[] {
  return [vocab.word]
}

function buildHintDisplay(word: string, hintLevel: number): string {
  const chars = word.split('')
  const letterIndices = chars
    .map((c, i) => /[a-zA-Z]/.test(c) ? i : -1)
    .filter(i => i !== -1)

  if (hintLevel <= 1) return ''

  if (hintLevel === 2) {
    return chars.map(c => /[a-zA-Z]/.test(c) ? '_' : c).join('')
  }

  const revealCount = hintLevel === 3 ? 1 : 3

  return chars.map((c, i) => {
    if (!/[a-zA-Z]/.test(c)) return c 
    const letterPos = letterIndices.indexOf(i)
    return letterPos < revealCount ? c : '_'
  }).join('')
}

function requeue(queue: WordState[], current: WordState): WordState[] {
  const rest = queue.slice(1)
  const wordId = getWordId(current.vocab)
  const deduped = rest.filter(w => getWordId(w.vocab) !== wordId)
  const reinsert: WordState = { ...current, stage: 'type', hintLevel: 0 }
  const insertAt = Math.min(2, deduped.length)
  return [
    ...deduped.slice(0, insertAt),
    reinsert,
    ...deduped.slice(insertAt),
  ]
}

// ===== MAIN COMPONENT =====
export default function WritingMode({ onExit, decks = [], initialWords }: WritingModeProps) {
  const { authHeaders } = useAuth()

  // ── Setup state ──
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sourceMode, setSourceMode] = useState('lowest_score')
  const [filterDeck, setFilterDeck] = useState('')
  const [enableRepeat, setEnableRepeat] = useState(true)
  const [hasAutoStarted, setHasAutoStarted] = useState(false)

  // ── Preview state ──
  const [previewWords, setPreviewWords] = useState<VocabItem[]>([])
  const [finalWords, setFinalWords] = useState<VocabItem[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // ── Practice state ──
  const [allWords, setAllWords] = useState<VocabItem[]>([])
  const [queue, setQueue] = useState<WordState[]>([])
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set())
  const [totalWords, setTotalWords] = useState(0)

  // ── Session state ──
  const [wrongAttemptsByWord, setWrongAttemptsByWord] = useState<Record<string, number>>({})
  const [failedWords, setFailedWords] = useState<VocabItem[]>([])
  const [firstAttemptByWord, setFirstAttemptByWord] = useState<Record<string, boolean>>({})
  
  // ── UI state ──
  const [typingPhase, setTypingPhase] = useState<TypingPhase>('answering')
  const [typingInput, setTypingInput] = useState('')
  const [retypeInput, setRetypeInput] = useState('')
  const [nearMissMsg, setNearMissMsg] = useState('')

  // ── Choice state (Phase B - pending rewrite, keep minimal for now) ──
  const [choiceOptions, setChoiceOptions] = useState<string[]>([])
  const [choiceSelected, setChoiceSelected] = useState<string | null>(null)

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null)
  const retypeRef = useRef<HTMLInputElement>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const submitLockRef = useRef(false)
  const correctionLockRef = useRef(false)
  
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAllTimers = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    feedbackTimerRef.current = null
    advanceTimerRef.current = null
  }, [])

  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  // ── Fetch Preview Words ──
  useEffect(() => {
    if (started || (initialWords && initialWords.length > 0)) {
      if (initialWords && initialWords.length > 0) {
        setPreviewWords(initialWords)
      }
      return
    }
    
    setLoadingPreview(true)
    setPreviewError(null)

    const ac = new AbortController()
    
    const fetchPreview = async () => {
      try {
        const url = new URL(`${PROGRESS_API_URL}/practice-words`, window.location.origin)
        url.searchParams.append('count', '100') // Fetch up to 100 words for the preview list
        url.searchParams.append('mode', sourceMode)
        url.searchParams.append('tier', 'all')
        if (filterDeck) url.searchParams.append('deckId', filterDeck)

        const res = await fetch(url.toString(), { headers: authHeaders(), signal: ac.signal })
        const json = await res.json()
        if (json.success && json.data) {
          setPreviewWords(json.data)
        } else {
          setPreviewError(json.message || 'Lỗi tải danh sách')
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setPreviewError('Lỗi kết nối server!')
        }
      } finally {
        setLoadingPreview(false)
      }
    }

    const timer = setTimeout(() => {
      fetchPreview()
    }, 400) // Debounce 400ms

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [started, sourceMode, filterDeck, authHeaders, initialWords])

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

  const buildChoiceOptions = useCallback((vocab: VocabItem, pool: VocabItem[]) => {
    const correct = vocab.meanings.join(', ')
    const others = pool.filter(w => getWordId(w) !== getWordId(vocab)).map(w => w.meanings.join(', '))
    const wrongs = shuffleArray(others).slice(0, 3)
    return shuffleArray([correct, ...wrongs])
  }, [])

  // ── START ──
  const startPractice = async () => {
    if (!finalWords || finalWords.length === 0) {
      toast.error('Không có từ nào phù hợp với bộ lọc hiện tại.')
      return
    }

    const words = finalWords.slice(0, 4)
    setAllWords(words)
    setTotalWords(words.length)
    
    setPassedIds(new Set())
    setWrongAttemptsByWord({})
    setFailedWords([])
    setFirstAttemptByWord({})

    const initialQueue: WordState[] = words.map(v => ({
      vocab: v,
      stage: 'type',
      hintLevel: 0,
    }))
    setQueue(initialQueue)
    setTypingInput('')
    setRetypeInput('')
    setTypingPhase('answering')
    setNearMissMsg('')
    
    clearAllTimers()
    submitLockRef.current = false
    correctionLockRef.current = false
    
    setChoiceOptions(buildChoiceOptions(words[0], words))
    setChoiceSelected(null)
    setStarted(true)
  }

  useEffect(() => {
    if (initialWords && initialWords.length > 0 && !started && !loading && !hasAutoStarted) {
      setAllWords(initialWords)
      setTotalWords(initialWords.length)
      
      setPassedIds(new Set())
      setWrongAttemptsByWord({})
      setFailedWords([])
      setFirstAttemptByWord({})

      const initialQueue: WordState[] = initialWords.map(v => ({
        vocab: v,
        stage: 'type',
        hintLevel: 0,
      }))
      setQueue(initialQueue)
      setTypingInput('')
      setRetypeInput('')
      setTypingPhase('answering')
      setNearMissMsg('')
      
      clearAllTimers()
      submitLockRef.current = false
      correctionLockRef.current = false
      
      setChoiceOptions(buildChoiceOptions(initialWords[0], initialWords))
      setChoiceSelected(null)
      setStarted(true)
      setHasAutoStarted(true)
    }
  }, [initialWords, started, loading, hasAutoStarted, buildChoiceOptions, clearAllTimers])

  const current = queue[0] ?? null

  useEffect(() => {
    if (current && (current.stage === 'type' || current.stage === 'type_retry')) {
      if (typingPhase === 'answering') {
         setTimeout(() => inputRef.current?.focus(), 100)
      } else if (typingPhase === 'correcting') {
         setTimeout(() => retypeRef.current?.focus(), 100)
      }
    }
  }, [current?.vocab._id, current?.stage, typingPhase])

  useEffect(() => {
    if (current?.stage === 'choice' && allWords.length > 0) {
      setChoiceOptions(buildChoiceOptions(current.vocab, allWords))
      setChoiceSelected(null)
    }
  }, [current?.stage, getWordId(current?.vocab || {} as VocabItem), buildChoiceOptions, allWords])

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

  const advance = useCallback((nextQueue: WordState[]) => {
    submitLockRef.current = false
    correctionLockRef.current = false
    clearAllTimers()
    setQueue(nextQueue)
    setTypingInput('')
    setRetypeInput('')
    setTypingPhase('answering')
    setNearMissMsg('')
    setChoiceSelected(null)
  }, [clearAllTimers])

  // ── HANDLE TYPE SUBMIT ──
  const handleTypeSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (submitLockRef.current) return
    if (typingPhase !== 'answering') return
    if (!typingInput.trim() || !current) return

    submitLockRef.current = true

    const wordId = getWordId(current.vocab)
    const { isCorrect, isNearMiss, nearMissTarget } = checkAnswer(typingInput, [current.vocab.word])
    const isHinted = current.hintLevel >= 1
    
    // Ghi first attempt
    if (!(wordId in firstAttemptByWord)) {
      setFirstAttemptByWord(prev => ({ ...prev, [wordId]: isCorrect }))
    }

    submitProgress(wordId, 'writing', isCorrect, isHinted)

    if (isCorrect) {
      setTypingPhase('feedback_ok')
      
      const newPassed = new Set(passedIds)
      newPassed.add(wordId)
      setPassedIds(newPassed)

      if (newPassed.size === totalWords) {
        setTimeout(() => confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } }), 300)
      }

      feedbackTimerRef.current = setTimeout(() => {
        if (isHinted && enableRepeat) {
          // Đúng có hint + enableRepeat → requeue sau 2 từ
          advance(requeue(queue, current))
        } else {
          // Đúng không hint, hoặc enableRepeat=false → xóa
          advance(queue.slice(1))
        }
      }, 700)
      
    } else {
      // Sai
      const currentAttempts = (wrongAttemptsByWord[wordId] ?? 0) + 1
      setWrongAttemptsByWord(prev => ({ ...prev, [wordId]: currentAttempts }))
      
      setTypingPhase('feedback_fail')
      
      if (isNearMiss) {
        setNearMissMsg(`Gần đúng! Kiểm tra lại chính tả: ${nearMissTarget}`)
      } else {
        setNearMissMsg('')
      }

      feedbackTimerRef.current = setTimeout(() => {
        setTypingPhase('correcting')
      }, 800) // Chờ 0.8s để xem đáp án đúng rồi bắt gõ lại
    }
  }, [current, typingInput, typingPhase, firstAttemptByWord, passedIds, totalWords, enableRepeat, queue, wrongAttemptsByWord, submitProgress, advance])

  // ── HANDLE CORRECTION SUBMIT ──
  const handleCorrection = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (correctionLockRef.current) return
    if (typingPhase !== 'correcting') return
    if (!retypeInput.trim() || !current) return

    const { isCorrect } = checkAnswer(retypeInput, [current.vocab.word])
    
    if (isCorrect) {
      correctionLockRef.current = true
      setTypingPhase('done')
      
      advanceTimerRef.current = setTimeout(() => {
        const wordId = getWordId(current.vocab)
        const attempts = wrongAttemptsByWord[wordId] ?? 0
        
        if (attempts >= 3 || !enableRepeat) {
           // Đánh dấu failed (hoặc nếu không repeat thì xem như xong nhưng k tính mastery)
           const nextFailedWords = [...failedWords, current.vocab]
           setFailedWords(nextFailedWords)
           advance(queue.slice(1))
        } else {
           // Requeue sau 2 từ
           advance(requeue(queue, current))
        }
      }, 400)
    } else {
      toast.error('Vui lòng gõ lại chính xác đáp án!')
    }
  }, [current, retypeInput, typingPhase, wrongAttemptsByWord, enableRepeat, failedWords, queue, advance])

  // ── HANDLE HINT ──
  const handleHint = () => {
    if (typingPhase !== 'answering') return
    if (!current) return
    
    const nextLevel = current.hintLevel + 1
    if (nextLevel > 4) return

    setQueue(prev => [{ ...prev[0], hintLevel: nextLevel }, ...prev.slice(1)])
    
    if (nextLevel === 1) {
       speakWord(current.vocab.word)
    }
  }

  // ── HANDLE CHOICE SELECT ──
  // (Giữ nguyên logic của ChoiceMode cũ vì nó thuộc Phase B, chỉ thay đổi requeue thay vì push)
  const handleChoiceSelect = useCallback((option: string) => {
    if (!current || choiceSelected) return
    setChoiceSelected(option)
    const correct = current.vocab.meanings.join(', ')
    const isCorrect = option === correct

    submitProgress(getWordId(current.vocab), 'recall', isCorrect, true)

    setTimeout(() => {
      if (isCorrect) {
        const nextState: WordState = { ...current, stage: 'type_retry', hintLevel: 1 } // isHinted
        advance([nextState, ...queue.slice(1)])
      } else {
        const nextState: WordState = { ...current, stage: 'flashcard', hintLevel: 1 }
        advance([nextState, ...queue.slice(1)])
      }
    }, 1500)
  }, [current, choiceSelected, queue, advance, submitProgress])

  const handleFlashcardContinue = useCallback(() => {
    if (!current) return
    speakWord(current.vocab.word)
    const nextState: WordState = { ...current, stage: 'type_retry', hintLevel: 1 }
    advance([nextState, ...queue.slice(1)])
  }, [current, queue, advance, speakWord])

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

                <label className="ws-label" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={enableRepeat} onChange={e => setEnableRepeat(e.target.checked)} />
                  Lặp lại từ sai (Enable Repeat)
                </label>
              </div>

              <div className="writing-setup-section">
                <div style={{ marginTop: 20, padding: '14px', background: 'rgba(139,92,246,0.06)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>💡 Cách hoạt động</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Nhập đúng tiếng Anh từ nghĩa. Gợi ý 5 cấp độ (âm thanh, số ký tự...). Bắt buộc gõ lại sau khi sai.
                  </p>
                </div>
              </div>
            </div>

            <div className="writing-setup-footer">
              <button className="ws-start-btn" onClick={startPractice} disabled={loadingPreview || finalWords.length === 0}>
                {loadingPreview ? 'Đang tải...' : `Bắt đầu Writing · ${Math.min(4, finalWords.length)} từ`}
                <PlayIcon className="icon" />
              </button>
            </div>
          </div>
          
          <div className="writing-setup-preview" style={{ marginTop: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Danh sách từ vựng sẽ luyện tập ({previewWords.length} từ)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Mỗi từ dưới đây sẽ được đưa vào phiên Writing nếu bạn bấm Bắt đầu.
              </p>
            </div>
            <WritingPreviewTable 
              words={previewWords} 
              loading={loadingPreview} 
              error={previewError}
              emptyMessage="Không có từ phù hợp với bộ lọc hiện tại. Hãy đổi bộ thẻ, cấp độ hoặc giảm điều kiện lọc."
              onPracticeWordsUpdate={setFinalWords}
            />
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: COMPLETE =====
  if (isComplete) {
    const directCorrectCount = Object.values(firstAttemptByWord).filter(v => v).length
    const pct = totalWords > 0 ? Math.round((directCorrectCount / totalWords) * 100) : 0
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📖'
    
    return (
      <div className="writing-container">
        <div className="writing-complete">
          <div className="wc-card">
            <div className="wc-emoji">{emoji}</div>
            <h2 className="wc-title">Hoàn thành!</h2>
            <p className="wc-subtitle">Bạn đã kết thúc phiên Writing</p>

            <div className="wc-stats">
              <div className="wc-stat">
                <span className="wc-stat-value green">{directCorrectCount}</span>
                <span className="wc-stat-label">Đúng ngay</span>
              </div>
              <div className="wc-stat">
                <span className="wc-stat-value purple">{pct}%</span>
                <span className="wc-stat-label">Thành thạo</span>
              </div>
            </div>

            {failedWords.length > 0 && (
              <div className="wp-failed-section">
                 <h3 className="wp-failed-title">📋 Cần ôn lại ({failedWords.length} từ)</h3>
                 <div className="wp-failed-list">
                    {failedWords.map(w => (
                       <div key={getWordId(w)} className="wp-failed-item">
                          <span className="wp-failed-en">{w.word}</span>
                          <span className="wp-failed-vi">{w.meanings.join(', ')}</span>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            <div className="wc-actions" style={{ marginTop: 24 }}>
              <button className="wc-btn-primary" onClick={() => {
                setStarted(false)
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
            key={`${getWordId(current.vocab)}-${current.stage}`}
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

                <div className="wp-hint-area">
                  <div className="wp-hint-level-bar">
                    {[1,2,3,4].map(l => (
                      <div key={l} className={`wp-hint-dot ${current.hintLevel >= l ? 'active' : ''}`} />
                    ))}
                  </div>
                  
                  {current.hintLevel > 0 && current.hintLevel <= 1 && (
                     <div className="wp-hint-feedback">
                        <SpeakerWaveIcon className="icon icon-inline" /> Đã nghe phát âm
                     </div>
                  )}

                  {current.hintLevel >= 2 && (
                    <div className="wp-blanks">
                      {buildHintDisplay(current.vocab.word, current.hintLevel)}
                    </div>
                  )}
                  
                  <button
                    className={`wp-hint-btn ${current.hintLevel >= 4 ? 'disabled' : ''}`}
                    onClick={handleHint}
                    disabled={current.hintLevel >= 4 || typingPhase !== 'answering'}
                    type="button"
                  >
                    <LightBulbIcon className="icon" />
                    {current.hintLevel === 0 ? 'Gợi ý' : current.hintLevel === 1 ? 'Gợi ý số ký tự' : current.hintLevel === 2 ? 'Hiện chữ đầu' : current.hintLevel === 3 ? 'Thêm ký tự' : 'Đã hết gợi ý'} →
                  </button>
                </div>

                {/* Form: Answering */}
                {(typingPhase === 'answering' || typingPhase === 'feedback_ok' || typingPhase === 'feedback_fail') && (
                   <form className="wp-type-form" onSubmit={handleTypeSubmit}>
                     <input
                       ref={inputRef}
                       type="text"
                       className={`wp-type-input ${typingPhase === 'feedback_ok' ? 'correct' : typingPhase === 'feedback_fail' ? 'incorrect' : ''}`}
                       placeholder="Gõ từ tiếng Anh..."
                       value={typingInput}
                       onChange={e => setTypingInput(e.target.value)}
                       disabled={typingPhase !== 'answering'}
                       autoComplete="off"
                       spellCheck={false}
                     />
                     
                     {typingPhase === 'feedback_ok' && (
                       <div className="wp-feedback correct"><CheckCircleIcon className="icon icon-inline"/> Chính xác! 🎯</div>
                     )}
                     {typingPhase === 'feedback_fail' && (
                       <div className="wp-feedback incorrect">
                         <XMarkIcon className="icon icon-inline"/> Đáp án đúng: <strong>{formatForDisplay(current.vocab.word)}</strong>
                       </div>
                     )}
                     {nearMissMsg && (
                       <div className="wp-near-miss-badge">{nearMissMsg}</div>
                     )}
                     
                     {typingPhase === 'answering' && (
                       <button
                         type="submit"
                         className="wp-submit-btn"
                         disabled={!typingInput.trim()}
                       >
                         Kiểm tra
                       </button>
                     )}
                   </form>
                )}

                {/* Form: Correcting */}
                {(typingPhase === 'correcting' || typingPhase === 'done') && (
                  <form className="wp-type-form" onSubmit={handleCorrection}>
                    <div className="wp-correction-box">
                      <div className="wpc-wrong">{typingInput}</div>
                      <div className="wpc-correct">
                         <XMarkIcon className="icon icon-inline"/> Đáp án đúng: <strong>{formatForDisplay(current.vocab.word)}</strong>
                      </div>
                    </div>
                    
                    <input
                      ref={retypeRef}
                      type="text"
                      className="wp-retype-input"
                      placeholder={`Gõ lại: ${formatForDisplay(current.vocab.word)}`}
                      value={retypeInput}
                      onChange={e => setRetypeInput(e.target.value)}
                      disabled={typingPhase === 'done'}
                      autoComplete="off"
                      spellCheck={false}
                      style={{ marginTop: 8 }}
                    />
                    
                    <button
                      type="submit"
                      className="wp-submit-btn"
                      disabled={!retypeInput.trim() || typingPhase === 'done'}
                    >
                      Tiếp tục
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── CHOICE (Phase B - Giữ nguyên tạm) ── */}
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
