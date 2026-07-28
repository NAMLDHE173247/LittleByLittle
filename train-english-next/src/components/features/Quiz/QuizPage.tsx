import './QuizPage.css'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
  LightBulbIcon,
  ArrowsRightLeftIcon,
  FunnelIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  TrophyIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ForwardIcon,
  CommandLineIcon,
  LanguageIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { checkAnswer } from '@/lib/utils/answerUtils'
import { useGlobalData } from '@/components/providers/GlobalDataProvider'
import TTSSettingsModal from '@/components/shared/TTSSettingsModal'
import {
  createSessionState,
  getTier,
  normalizeSource,
  recordAnswer,
  selectNextQuestion,
  type CombineStrategy,
  type PlannedQuestion,
  type PlannerProgress,
  type QuestionType,
  type QuizSessionState,
  type SourceOrder,
  type SourceScope,
  type TranslationDirection,
} from './quizPlanner'
import QuizQuestionImage from './QuizQuestionImage'
import VocabularyFeedbackCard from './VocabularyFeedbackCard'
import CustomSelect from '@/components/shared/CustomSelect/CustomSelect'
import HelpTooltip from '@/components/shared/HelpTooltip/HelpTooltip'

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

interface QuizSettings {
  mode: TranslationDirection
  questionTypes: QuestionType[]
  questionCount: number
  shuffle: boolean
  autoNext: boolean
  filterDeck: string
  filterLevel: string
  filterTopic: string
  filterPOS: string
  filterTier: string
  sourceMode: string
  sourceScope: SourceScope
  sourceOrder: SourceOrder
  combineStrategy: CombineStrategy
  filterStarredOnly?: boolean
  requireRetypeOnWrong: boolean
  showImageInQuestion: boolean
}

interface QuizQuestion {
  vocab: VocabularyItem
  type: QuestionType
  direction: Exclude<TranslationDirection, 'mixed'>
  questionText: string
  correctAnswer: string
  options: string[] // for multiple/listen
  correctIdx: number
  retryForWordId?: string
  downgradedFrom?: QuestionType
}

interface QuizPageProps {
  vocabularies: VocabularyItem[]
  decks: DeckItem[]
  masteryWords?: PlannerProgress[]
  onExit: () => void
  onEditWord: (vocab: VocabularyItem) => void
  speak: (word: string, options?: Record<string, unknown>) => void
  submitProgress?: (wordId: string, skill: string, isCorrect: boolean, isHinted?: boolean) => void
  onQuizActiveChange?: (isActive: boolean) => void
  stopSpeaking?: () => void
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

const getVocabId = (vocab: Pick<VocabularyItem, '_id'> & { wordId?: string }): string => vocab._id || vocab.wordId || ''

const isSkillDue = (skill: unknown, now: number): boolean => {
  if (typeof skill !== 'object' || skill === null) return false
  const typedSkill = skill as { points?: unknown; nextReview?: string }
  const nextReview = typedSkill.nextReview
  const points = Number(typedSkill.points ?? 0)
  return points > 0 && Boolean(nextReview) && new Date(nextReview as string).getTime() <= now
}

function createQuizQuestion(
  planned: PlannedQuestion<VocabularyItem>,
  allVocabularies: VocabularyItem[]
): QuizQuestion {
  const { vocab, type, direction } = planned
  const questionText = direction === 'en2vi'
    ? vocab.word
    : vocab.meanings.join(', ')

  const correctAnswer = direction === 'en2vi'
    ? vocab.meanings.join(', ')
    : vocab.word

  const options: string[] = []
  let correctIdx = 0

  if (type === 'multiple' || type === 'listen') {
    const normalize = (str: string) => str.toLowerCase().trim()
    const correctAnsNorm = normalize(correctAnswer)

    const validWrongs = allVocabularies.filter(w => {
      const wId = getVocabId(w)
      const vId = getVocabId(vocab)
      if (wId === vId) return false
      const wAns = direction === 'en2vi' ? w.meanings?.join(', ') : w.word
      if (!wAns) return false
      if (normalize(wAns) === correctAnsNorm) return false
      return true
    })

    const uniqueWrongsMap = new Map<string, string>()
    validWrongs.forEach(w => {
      const wAns = direction === 'en2vi' ? w.meanings?.join(', ') : w.word
      if (!wAns) return
      const norm = normalize(wAns)
      if (!uniqueWrongsMap.has(norm)) {
        uniqueWrongsMap.set(norm, wAns)
      }
    })
    let distinctWrongAnswers = Array.from(uniqueWrongsMap.values())

    if (distinctWrongAnswers.length < 3) {
      const vId = getVocabId(vocab)
      const others = allVocabularies.filter(w => getVocabId(w) !== vId)
      distinctWrongAnswers = others.map(w => direction === 'en2vi' ? w.meanings?.join(', ') || '' : w.word).filter(Boolean)
    }

    const actualWrongs = Math.min(distinctWrongAnswers.length, 3)
    const picked = shuffleArray(distinctWrongAnswers).slice(0, actualWrongs)

    const totalOptions = actualWrongs + 1
    correctIdx = Math.floor(Math.random() * totalOptions)

    let wi = 0
    for (let i = 0; i < totalOptions; i++) {
      if (i === correctIdx) options.push(correctAnswer)
      else { options.push(picked[wi]); wi++ }
    }
  }

  return {
    vocab,
    type,
    direction,
    questionText,
    correctAnswer,
    options,
    correctIdx,
    retryForWordId: planned.retryForWordId,
    downgradedFrom: planned.downgradedFrom,
  }
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
  filterTier: 'all',
  sourceMode: 'random',
  sourceScope: 'all',
  sourceOrder: 'random',
  combineStrategy: 'smart',
  requireRetypeOnWrong: false,
  showImageInQuestion: true
}

// ===== COMPONENT =====
export default function QuizPage({ vocabularies, decks, masteryWords, onEditWord, speak, stopSpeaking, submitProgress, onQuizActiveChange }: QuizPageProps) {
  const { ttsAccent, ttsSettingsReady } = useGlobalData()
  const [settings, setSettings] = useState<QuizSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('quizSettings')
        if (saved) {
          const parsed = JSON.parse(saved)
          // Do not persist filters to avoid empty states when switching contexts
          return {
            ...defaultSettings,
            ...parsed,
            filterDeck: '',
            filterLevel: '',
            filterTopic: '',
            filterPOS: '',
            filterTier: 'all'
          }
        }
      } catch (e) {
        console.error('Failed to parse quiz settings', e)
      }
    }
    return { ...defaultSettings }
  })
  const [activeSettings, setActiveSettings] = useState<QuizSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isTTSSettingsOpen, setIsTTSSettingsOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const [sessionMode, setSessionMode] = useState<'normal' | 'wrong-practice'>('normal')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [starred, setStarred] = useState<Set<number>>(new Set())
  const [fillInput, setFillInput] = useState('')
  const [fillNearMissMsg, setFillNearMissMsg] = useState('')
  const [fillCorrect, setFillCorrect] = useState<boolean | null>(null)
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([])
  const [showReview, setShowReview] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [showHintText, setShowHintText] = useState(false)
  const [showExampleTranslation, setShowExampleTranslation] = useState(false)
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('quizAutoPlayAudio') === 'true'
  })
  const settingsLoaded = true
  const fillInputRef = useRef<HTMLInputElement>(null)
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceLockRef = useRef(false)
  const spokenQuestionIdx = useRef<number>(-1)
  const plannerSessionRef = useRef<QuizSessionState<VocabularyItem> | null>(null)
  const originalSessionWordsRef = useRef<VocabularyItem[]>([])

  // Map progress to easy lookup
  const progressMap = useMemo(() => {
    const map = new Map<string, PlannerProgress>()
    if (masteryWords) {
      masteryWords.forEach(mw => {
        const id = mw.wordId || mw._id
        if (id) map.set(id, mw)
      })
    }
    return map
  }, [masteryWords])

  // Derive filtered words
  const filteredWords = useMemo(() => {
    let result = vocabularies.filter(v => {
      if (v.meanings.length === 0) return false
      if (settings.filterDeck && !v.deckIds.some(d => d._id === settings.filterDeck)) return false
      if (settings.filterLevel && v.level !== settings.filterLevel) return false
      if (settings.filterTopic && v.topic !== settings.filterTopic) return false
      if (settings.filterPOS && v.partOfSpeech !== settings.filterPOS) return false

      if (settings.filterTier && settings.filterTier !== 'all') {
        const vId = getVocabId(v)
        const mw = progressMap.get(vId)
        const tier = getTier(mw)
        if (tier !== settings.filterTier) return false
      }
      return true
    })

    const source = normalizeSource(settings.sourceMode, Boolean(settings.filterDeck))
    if (source.sourceScope === 'weak') {
      result = result.filter(v => {
        const mw = progressMap.get(getVocabId(v))
        const tier = getTier(mw)
        return tier === 'not_started' || tier === 'learning' || Number(mw?.overall ?? 0) < 50
      })
    } else if (source.sourceScope === 'due') {
      const now = new Date().getTime()
      result = result.filter(v => {
        const vId = getVocabId(v)
        const mw = progressMap.get(vId)
        if (!mw) return false
        return Boolean(mw.isDecaying) ||
          isSkillDue(mw.skills?.recall, now) ||
          isSkillDue(mw.skills?.listening, now) ||
          isSkillDue(mw.skills?.writing, now) ||
          isSkillDue(mw.skills?.pronunciation, now)
      })
    }

    if (source.sourceOrder === 'lowest_score' || source.sourceOrder === 'adaptive') {
      result.sort((a, b) => {
        const scoreA = progressMap.get(a._id)?.overall || 0
        const scoreB = progressMap.get(b._id)?.overall || 0
        if (scoreA !== scoreB) return scoreA - scoreB
        return 0
      })
    } else if (source.sourceOrder === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    } else if (source.sourceOrder === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    } else {
      result.sort((a, b) => a.word.localeCompare(b.word))
    }

    return result
  }, [vocabularies, settings, progressMap])

  // Unique values for filters
  const uniqueLevels = [...new Set(vocabularies.map(v => v.level).filter(Boolean))].sort()
  const uniqueTopics = [...new Set(vocabularies.map(v => v.topic).filter(Boolean))].sort()
  const uniquePOS = [...new Set(vocabularies.map(v => v.partOfSpeech).filter(Boolean))].sort()

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current)
      stopSpeaking?.()
    }
  }, [stopSpeaking])

  // Notify parent when quiz active state changes
  useEffect(() => {
    onQuizActiveChange?.(started)
  }, [started, onQuizActiveChange])

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Exclude filters from being saved to avoid contextual issues
      const { filterDeck, filterLevel, filterTopic, filterPOS, filterTier, ...settingsToSave } = settings
      localStorage.setItem('quizSettings', JSON.stringify(settingsToSave))
    }
  }, [settings])

  const updateSetting = useCallback((key: keyof QuizSettings, value: unknown) => {
    setSettings(prev => {
      if (key === 'sourceMode') {
        const source = normalizeSource(String(value), Boolean(prev.filterDeck))
        return { ...prev, sourceMode: String(value), ...source }
      }
      if (key === 'filterDeck') {
        const source = normalizeSource(prev.sourceMode, Boolean(value))
        return { ...prev, filterDeck: String(value), ...source }
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const toggleAutoPlayAudio = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setAutoPlayAudio(prev => {
      const next = !prev
      localStorage.setItem('quizAutoPlayAudio', String(next))
      return next
    })
  }

  // Unified Auto-speak effect
  useEffect(() => {
    if (!started || !settingsLoaded || answered || !ttsSettingsReady) return;
    
    if (spokenQuestionIdx.current === currentIdx) return;

    const q = questions[currentIdx];
    if (!q || !q.vocab || !q.vocab.word) return;

    if (q.type === 'listen' || autoPlayAudio) {
      speak(q.vocab.word, { mode: q.type === 'listen' ? 'quiz-listen' : 'autoplay', source: 'quiz-question', ownerId: 'quiz-session' });
    }
    spokenQuestionIdx.current = currentIdx;
  }, [currentIdx, started, questions, answered, autoPlayAudio, settingsLoaded, speak, ttsSettingsReady]);

  // Focus fill input
  useEffect(() => {
    if (started && questions[currentIdx]?.type === 'fill' && !answered) {
      setTimeout(() => fillInputRef.current?.focus(), 100)
    }
  }, [currentIdx, started, questions, answered])

  const supportsRetryOnWrong = (types: string[]) => types.includes('fill')

  const resetQuestionUi = useCallback(() => {
    setSelected(null)
    setAnswered(false)
    setFillInput('')
    setFillNearMissMsg('')
    setFillCorrect(null)
    setHintUsed(false)
    setShowHintText(false)
    setShowExampleTranslation(false)
    advanceLockRef.current = false
  }, [])

  const syncPlannerSession = useCallback((session: QuizSessionState<VocabularyItem>) => {
    plannerSessionRef.current = session
  }, [])

  const appendNextQuestion = useCallback((session: QuizSessionState<VocabularyItem>) => {
    const result = selectNextQuestion(session)
    syncPlannerSession(result.session)
    if (!result.question) return false
    setQuestions(prev => [...prev, createQuizQuestion(result.question!, originalSessionWordsRef.current)])
    return true
  }, [syncPlannerSession])

  const startQuiz = useCallback(() => {
    stopSpeaking?.()
    // Allow starting with at least 1 word for multiple/listen too
    if (filteredWords.length < 1) return
    originalSessionWordsRef.current = filteredWords

    const source = normalizeSource(settings.sourceMode, Boolean(settings.filterDeck))
    const activeSet = {
      ...settings,
      ...source,
      questionCount: settings.questionCount > 50 ? filteredWords.length : settings.questionCount,
      combineStrategy: settings.questionTypes.length > 1 ? settings.combineStrategy : 'smart' as CombineStrategy,
    }
    if (!supportsRetryOnWrong(activeSet.questionTypes)) {
      activeSet.requireRetypeOnWrong = false
    }
    const session = createSessionState(filteredWords, masteryWords || [], {
      direction: activeSet.mode,
      questionTypes: activeSet.questionTypes,
      questionCount: activeSet.questionCount,
      shuffle: activeSet.shuffle,
      sourceScope: activeSet.sourceScope,
      sourceOrder: activeSet.sourceOrder,
      combineStrategy: activeSet.combineStrategy,
    })
    const first = selectNextQuestion(session)
    if (!first.question) return

    syncPlannerSession(first.session)
    setQuestions([createQuizQuestion(first.question, originalSessionWordsRef.current)])
    setActiveSettings(activeSet)
    setCurrentIdx(0)
    resetQuestionUi()
    setCorrectCount(0)
    setTotalAnswered(0)
    setWrongAnswers([])
    setShowReview(false)
    spokenQuestionIdx.current = -1
    setSessionMode('normal')
    setStarted(true)
  }, [filteredWords, masteryWords, resetQuestionUi, settings, stopSpeaking, syncPlannerSession])

  const startPracticeWrongWords = useCallback(() => {
    stopSpeaking?.()
    
    // 3. Snapshot and deduplicate by stable ID before resetting
    const wrongQs = wrongAnswers.map(i => questions[i]).filter(Boolean)
    const wrongVocabs = wrongQs.map(q => q.vocab)
    // 4. Deduplicate by stable ID
    const uniqueVocabs = Array.from(new Map(wrongVocabs.map(v => [getVocabId(v), v])).values())

    if (uniqueVocabs.length < 1) return

    // 2. Temporary practice settings (do not write to settings.questionCount permanently)
    const practiceSettings = {
      ...(activeSettings || settings),
      questionCount: uniqueVocabs.length,
      shuffle: true,
      sourceScope: 'all' as SourceScope,
      sourceOrder: 'random' as SourceOrder
    }
    
    // 7. Distractor pool uses originalSessionWordsRef.current in createQuizQuestion
    const session = createSessionState(uniqueVocabs, masteryWords || [], {
      direction: practiceSettings.mode,
      questionTypes: practiceSettings.questionTypes,
      questionCount: practiceSettings.questionCount,
      shuffle: practiceSettings.shuffle,
      sourceScope: practiceSettings.sourceScope,
      sourceOrder: practiceSettings.sourceOrder,
      combineStrategy: practiceSettings.combineStrategy || 'smart',
      ensureAllCandidatesOnce: true,
    })
    
    const first = selectNextQuestion(session)
    if (!first.question) return

    syncPlannerSession(first.session)
    setQuestions([createQuizQuestion(first.question, originalSessionWordsRef.current)])
    
    // Update activeSettings so UI reflects correct count for this round
    setActiveSettings(practiceSettings)
    
    // 5 & 6. Reset ALL transient states for the new round
    setCurrentIdx(0)
    resetQuestionUi()
    setCorrectCount(0)
    setTotalAnswered(0)
    setWrongAnswers([]) // Clears wrongAnswers for this new round
    setShowReview(false)
    spokenQuestionIdx.current = -1
    setSessionMode('wrong-practice')
    setStarted(true)
  }, [activeSettings, settings, masteryWords, wrongAnswers, questions, resetQuestionUi, stopSpeaking, syncPlannerSession])

  const handleRestart = () => {
    stopSpeaking?.()
    setStarted(false)
    setQuestions([])
    plannerSessionRef.current = null
    setCurrentIdx(0)
    resetQuestionUi()
    setCorrectCount(0)
    setTotalAnswered(0)
    setWrongAnswers([])
    setShowReview(false)
    spokenQuestionIdx.current = -1
  }

  const goNext = useCallback(() => {
    if (advanceLockRef.current) return
    advanceLockRef.current = true
    if (autoNextTimer.current) clearTimeout(autoNextTimer.current)
    const session = plannerSessionRef.current
    if (session && session.answeredCount < session.settings.questionCount && currentIdx + 1 >= questions.length) {
      appendNextQuestion(session)
    }
    setCurrentIdx(prev => prev + 1)
    resetQuestionUi()
  }, [appendNextQuestion, currentIdx, questions.length, resetQuestionUi])

  const handleNext = goNext

  const scheduleAutoNext = useCallback(() => {
    if ((activeSettings || settings).autoNext) {
      autoNextTimer.current = setTimeout(goNext, 1200)
    }
  }, [activeSettings, settings, goNext])

  const recordQuestionResult = useCallback((q: QuizQuestion, isCorrect: boolean, hinted = false) => {
    const session = plannerSessionRef.current
    if (!session) return
    const nextSession = recordAnswer(session, q, isCorrect, hinted)
    syncPlannerSession(nextSession)
  }, [syncPlannerSession])

  // ---- Multiple Choice Handler ----
  const handleSelect = (idx: number) => {
    if (answered) return
    const q = questions[currentIdx]
    setSelected(idx)
    setAnswered(true)
    setTotalAnswered(prev => prev + 1)
    
    speak(q.vocab.word, { mode: 'manual', source: 'quiz-answer-feedback', ownerId: 'quiz-session' })

    const isCorrect = idx === q.correctIdx
    const skill = q.type === 'listen' ? 'listening' : 'recall'
    recordQuestionResult(q, isCorrect, hintUsed)

    if (submitProgress) {
      const vId = getVocabId(q.vocab)
      submitProgress(vId, skill, isCorrect, hintUsed)
    }

    if (isCorrect) {
      if (hintUsed) {
        toast.info("Chính xác! (Câu này không được cộng điểm vì đã dùng gợi ý 💡)")
      } else {
        setCorrectCount(prev => prev + 1)
      }
      scheduleAutoNext()
    } else {
      setWrongAnswers(prev => [...prev, currentIdx])
    }
  }

  // ---- Don't Know Handler ----
  const handleDontKnow = () => {
    if (answered) return
    setFillInput('')
    setSelected(-1)
    setAnswered(true)
    setTotalAnswered(prev => prev + 1)
    setWrongAnswers(prev => [...prev, currentIdx])

    const q = questions[currentIdx]
    speak(q.vocab.word, { mode: 'manual', source: 'quiz-answer-feedback', ownerId: 'quiz-session' })
    const skill = q.type === 'listen' ? 'listening' : q.type === 'fill' ? 'writing' : 'recall'
    recordQuestionResult(q, false, false)
    if (submitProgress) {
      const vId = getVocabId(q.vocab)
      submitProgress(vId, skill, false, false)
    }
  }

  // ---- Fill-in-blank Handler ----
  const handleFillSubmit = () => {
    if (answered && !(activeSettings?.requireRetypeOnWrong && fillCorrect === false)) return
    if (!fillInput.trim()) return

    const q = questions[currentIdx]
    const activeMode = q.direction
    
    let validAnswers = [q.correctAnswer]
    if (activeMode === 'en2vi') validAnswers = [...validAnswers, ...q.vocab.meanings]
    if (activeMode === 'vi2en') validAnswers = [...validAnswers, ...(q.vocab.synonyms || [])]

    const { isCorrect, isNearMiss } = checkAnswer(fillInput, validAnswers)

    if (answered && activeSettings?.requireRetypeOnWrong && fillCorrect === false) {
      if (isCorrect) {
        setFillNearMissMsg('')
        setFillCorrect(true)
        speak(q.vocab.word, { mode: 'manual', source: 'quiz-answer-feedback', ownerId: 'quiz-session' })
        
        if (activeSettings?.autoNext) {
          autoNextTimer.current = setTimeout(handleNext, 1200)
        }
      }
      return
    }

    if (isNearMiss && !isCorrect) {
      setFillNearMissMsg('Gần đúng, kiểm tra lại chính tả.')
      return
    }

    if (!answered) {
      speak(q.vocab.word, { mode: 'manual', source: 'quiz-answer-feedback', ownerId: 'quiz-session' })
    }

    setFillNearMissMsg('')
    setAnswered(true)
    setFillCorrect(isCorrect)

    const vId = getVocabId(q.vocab)
    const skill = q.type === 'listen' ? 'listening' : q.type === 'fill' ? 'writing' : 'recall'
    recordQuestionResult(q, isCorrect, hintUsed)

    if (isCorrect) {
      setCorrectCount(prev => prev + 1)
      if (submitProgress) submitProgress(vId, skill, true, hintUsed)
      if (activeSettings?.autoNext) {
        autoNextTimer.current = setTimeout(handleNext, 1000)
      }
    } else {
      setWrongAnswers(prev => [...prev, currentIdx])
      if (submitProgress) submitProgress(vId, skill, false, hintUsed)
    }
    setTotalAnswered(prev => prev + 1)
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
            {wrongQs.map((q, i) => {
              return (
                <div key={i} className="quiz-review-item">
                  <div className="quiz-question-prompt">
                    <h3>{q.questionText}</h3>
                    {q.direction === 'en2vi' && q.vocab.pronunciation && (
                      <p className="quiz-pronunciation">{q.vocab.pronunciation}</p>
                    )}
                  </div>
                  <div className="quiz-review-word">
                    <strong>{q.vocab.word}</strong>
                    {q.vocab.pronunciation && <span className="quiz-review-pron">{q.vocab.pronunciation}</span>}
                    <button className="quiz-action-icon" onClick={() => speak(q.vocab.word, { mode: 'manual', source: 'quiz-review', ownerId: 'quiz-session' })}>
                      <SpeakerWaveIcon className="icon" />
                    </button>
                  </div>
                  <div className="quiz-review-meaning">{q.vocab.meanings.join(', ')}</div>
                  {q.vocab.imageUrl && (
                    <img src={q.vocab.imageUrl} alt="" className="quiz-review-img" onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="quiz-review-actions">
            <button className="btn-primary" onClick={handleRestart}>
              <ArrowPathIcon className="icon icon-inline" /> Làm lại Quiz
            </button>
            {wrongAnswers.length > 0 && (
              <>
                <button 
                  className="btn-primary" 
                  style={{ background: '#8B5CF6' }}
                  onClick={startPracticeWrongWords}
                >
                  <ArrowPathIcon className="icon icon-inline" /> Tiếp tục ôn từ sai
                </button>
                <button 
                  className="btn-outline" 
                  onClick={() => {
                    const wrongQs = wrongAnswers.map(i => questions[i]).filter(Boolean)
                    const wrongVocabs = wrongQs.map(q => q.vocab)
                    const uniqueVocabs = Array.from(new Map(wrongVocabs.map(v => [getVocabId(v), v])).values())
                    sessionStorage.setItem('writingWords', JSON.stringify(uniqueVocabs))
                    window.location.href = '/writing'
                  }}
                >
                  <PencilSquareIcon className="icon icon-inline" /> Luyện viết các từ sai
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== RENDER: Completion Screen =====
  if (started && currentIdx >= questions.length) {
    stopSpeaking?.()
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
          {wrongAnswers.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn-primary" 
                style={{ background: '#8B5CF6' }}
                onClick={startPracticeWrongWords}
              >
                <ArrowPathIcon className="icon icon-inline" /> Tiếp tục ôn từ sai
              </button>
              <button 
                className="btn-outline" 
                onClick={() => {
                  const wrongQs = wrongAnswers.map(i => questions[i]).filter(Boolean)
                  const wrongVocabs = wrongQs.map(q => q.vocab)
                  const uniqueVocabs = Array.from(new Map(wrongVocabs.map(v => [getVocabId(v), v])).values())
                  sessionStorage.setItem('writingWords', JSON.stringify(uniqueVocabs))
                  window.location.href = '/writing'
                }}
              >
                <PencilSquareIcon className="icon icon-inline" /> Luyện viết các từ sai
              </button>
            </div>
          )}
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
          <div className="quiz-start-body">
            <div className="quiz-start-stats">
              <div className="quiz-info-item">
                <div className="quiz-info-icon-wrapper">
                  <BookOpenIcon className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="quiz-info-text">
                  <span className="quiz-info-num">{availableCount}</span>
                  <span className="quiz-info-label">từ khả dụng</span>
                </div>
              </div>
              <div className="quiz-info-item">
                <div className="quiz-info-icon-wrapper">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="quiz-info-text">
                  <span className="quiz-info-num">
                    {settings.questionCount > 50 ? availableCount : settings.questionCount}
                  </span>
                  <span className="quiz-info-label">câu hỏi</span>
                </div>
              </div>
              <div className="quiz-info-item">
                <div className="quiz-info-icon-wrapper">
                  <TrophyIcon className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="quiz-info-text">
                  <span className="quiz-info-num">{settings.questionTypes.length}</span>
                  <span className="quiz-info-label">chế độ</span>
                </div>
              </div>
            </div>

            <div className="quiz-start-config">
              <div className="quiz-start-config-title">
                <div className="flex items-center gap-2">
                  <AdjustmentsHorizontalIcon className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-[15px] text-gray-800 dark:text-gray-200">Thiết lập buổi luyện</span>
                </div>
                <div className="text-[13px] text-gray-500 dark:text-gray-400 font-normal">Điều chỉnh trước khi bắt đầu</div>
              </div>
              
              <div className="quiz-config-grid">
                <div className="quiz-config-field">
                  <span className="quiz-config-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Hướng
                    <HelpTooltip placement="bottom" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">🔁</span><span className="ht-header-title">Hướng dịch</span></div>
                        <div className="ht-body">
                          <p className="ht-desc">Xác định câu hỏi hiển thị từ hay nghĩa trước.</p>
                          <div className="ht-options">
                            <div className="ht-opt"><span className="ht-opt-badge">Anh→Việt</span><span className="ht-opt-text">Thấy từ tiếng Anh → nhớ nghĩa. <em>Phù hợp người mới bắt đầu.</em></span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Việt→Anh</span><span className="ht-opt-text">Thấy nghĩa tiếng Việt → nhớ từ. <em>Khó hơn, luyện khả năng sản xuất.</em></span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Trộn lẫn</span><span className="ht-opt-text">Cả hai hướng xen kẽ ngẫu nhiên. <em>Luyện toàn diện nhất.</em></span></div>
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">💡</span><span>Khi đã quen, hãy chuyển sang <strong>Trộn lẫn</strong> để não không bị học theo một chiều.</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <CustomSelect
                    value={settings.mode}
                    onChange={v => updateSetting('mode', v)}
                    options={[
                      { value: 'en2vi', label: 'Anh → Việt' },
                      { value: 'vi2en', label: 'Việt → Anh' },
                      { value: 'mixed', label: 'Trộn lẫn' },
                    ]}
                  />
                </div>

                <div className="quiz-config-field">
                  <span className="quiz-config-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Nguồn
                    <HelpTooltip placement="bottom" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">🎯</span><span className="ht-header-title">Nguồn từ vựng</span></div>
                        <div className="ht-body">
                          <p className="ht-desc">Quy định hệ thống lấy từ đâu để tạo câu hỏi.</p>
                          <div className="ht-options">
                            <div className="ht-opt"><span className="ht-opt-badge">Ngẫu nhiên</span><span className="ht-opt-text">Lấy ngẫu nhiên từ toàn bộ kho từ vựng của bạn.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Từ yếu</span><span className="ht-opt-text">Ưu tiên từ có điểm thành thạo thấp nhất (dưới 40 điểm). <em>Tập trung vào điểm yếu.</em></span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Cần ôn tập</span><span className="ht-opt-text">Chỉ lấy từ đã đến hạn ôn theo lịch lặp cách quãng (Spaced Repetition). <em>Tối ưu nhất cho trí nhớ dài hạn.</em></span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Trong bộ</span><span className="ht-opt-text">Giới hạn trong bộ thẻ đã chọn bên cạnh.</span></div>
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">🔥</span><span>Combo <strong>Từ yếu</strong> + <strong>Điền từ</strong> = cực kỳ hiệu quả để xử lý từ hay quên.</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <CustomSelect
                    value={settings.sourceMode}
                    onChange={v => updateSetting('sourceMode', v)}
                    options={[
                      { value: 'random', label: 'Ngẫu nhiên' },
                      { value: 'weak', label: 'Từ yếu' },
                      { value: 'due', label: 'Cần ôn tập' },
                      { value: 'deck', label: 'Chỉ trong bộ' },
                    ]}
                  />
                </div>

                <div className="quiz-config-field">
                  <span className="quiz-config-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Bộ thẻ
                    <HelpTooltip placement="bottom" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">📦</span><span className="ht-header-title">Lọc theo bộ thẻ</span></div>
                        <div className="ht-body">
                          <p className="ht-desc">Giới hạn câu hỏi chỉ lấy từ một bộ thẻ cụ thể.</p>
                          <div className="ht-how">
                            <div className="ht-how-label">Cơ chế</div>
                            Chọn <strong>Tất cả</strong> → lấy từ toàn bộ kho từ vựng.<br/>Chọn một bộ cụ thể → chỉ lấy từ trong bộ đó, ngay cả khi Nguồn là "Ngẫu nhiên".
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">📚</span><span>Dùng bộ thẻ khi học theo chủ đề (VD: Bộ "Du lịch", "Công việc").</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <CustomSelect
                    value={settings.filterDeck}
                    onChange={v => updateSetting('filterDeck', v)}
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...decks.map(d => ({ value: d._id, label: d.name })),
                    ]}
                  />
                </div>

                <div className="quiz-config-field">
                  <span className="quiz-config-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Độ thành thạo
                    <HelpTooltip placement="bottom" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">📊</span><span className="ht-header-title">Lọc theo mức thành thạo</span></div>
                        <div className="ht-body">
                          <p className="ht-desc">Mỗi từ có điểm 0–100. Trả lời đúng → tăng điểm, sai → giảm điểm.</p>
                          <div className="ht-options">
                            <div className="ht-opt"><span className="ht-opt-badge">0 điểm</span><span className="ht-opt-text">Chưa từng luyện hoặc liên tục sai.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">1–39</span><span className="ht-opt-text">Đang học, hay quên. Cần ôn nhiều lần.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">40–79</span><span className="ht-opt-text">Khá quen nhưng chưa chắc chắn.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">80+</span><span className="ht-opt-text">Thành thạo, gần như không quên.</span></div>
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">💡</span><span>Lọc <strong>Đang học (1–39)</strong> để tập trung vào những từ chưa vào não.</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <CustomSelect
                    value={settings.filterTier}
                    onChange={v => updateSetting('filterTier', v)}
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'not_started', label: 'Chưa học (0)' },
                      { value: 'learning', label: 'Đang học (1-39)' },
                      { value: 'familiar', label: 'Khá quen (40-79)' },
                      { value: 'mastered', label: 'Thành thạo (80+)' },
                    ]}
                  />
                </div>
              </div>

              {(() => {
                const extraCount = (settings.filterLevel ? 1 : 0) + (settings.filterTopic ? 1 : 0) + (settings.filterPOS ? 1 : 0)
                if (extraCount === 0) return null
                return (
                  <div className="w-full flex justify-center" style={{ marginBottom: '24px' }}>
                    <div 
                      className="text-[13px] text-indigo-600 bg-indigo-50 font-medium hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-900/50 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 cursor-pointer flex justify-center items-center gap-2 py-1.5 px-4 rounded-full transition-colors shadow-sm"
                      onClick={() => setShowSettings(true)}
                    >
                      <FunnelIcon className="w-4 h-4" />
                      Đang áp dụng thêm {extraCount} bộ lọc khác
                      <ChevronDownIcon className="w-3 h-3 opacity-70" />
                    </div>
                  </div>
                )
              })()}

              <div style={{ marginBottom: '28px' }}>
                <span className="quiz-config-label block mb-2" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  Loại câu hỏi
                  <HelpTooltip placement="right" content={
                    <div>
                      <div className="ht-header"><span className="ht-header-icon">❓</span><span className="ht-header-title">Dạng câu hỏi</span></div>
                      <div className="ht-body">
                        <div className="ht-options">
                          <div className="ht-opt"><span className="ht-opt-badge">Trắc nghiệm</span><span className="ht-opt-text">1 đáp án đúng trong 4. Lựa chọn sai lấy từ kho từ vựng. <em>Dễ nhất, phù hợp khởi động.</em></span></div>
                          <div className="ht-opt"><span className="ht-opt-badge">Điền từ</span><span className="ht-opt-text">Tự gõ câu trả lời, chấp nhận lỗi chính tả nhỏ. <em>Khó nhất, hiệu quả nhất cho trí nhớ dài hạn.</em></span></div>
                          <div className="ht-opt"><span className="ht-opt-badge">Nghe</span><span className="ht-opt-text">Nghe audio TTS rồi chọn từ đúng. <em>Luyện kỹ năng nghe chính xác.</em></span></div>
                        </div>
                        <div className="ht-how">
                          <div className="ht-how-label">Lưu ý</div>
                          Có thể bật nhiều loại cùng lúc. Cài "Cách kết hợp" bên dưới để điều chỉnh tỉ lệ.
                        </div>
                      </div>
                    </div>
                  } />
                </span>
                <div className="flex gap-3">
                  {([
                    { id: 'multiple', label: 'Trắc nghiệm', icon: null },
                    { id: 'fill', label: 'Điền từ', icon: DocumentTextIcon },
                    { id: 'listen', label: 'Nghe', icon: SpeakerWaveIcon }
                  ] satisfies Array<{ id: QuestionType; label: string; icon: typeof DocumentTextIcon | typeof SpeakerWaveIcon | null }>).map(type => {
                    const isActive = settings.questionTypes.includes(type.id)
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        className={`flex-1 px-4 text-[15px] font-medium flex items-center justify-center gap-2 quiz-type-btn ${
                          isActive ? 'quiz-type-btn-active' : ''
                        }`}
                        style={{ padding: '14px 0', borderRadius: '9999px' }}
                        onClick={() => {
                          const newTypes = isActive 
                            ? settings.questionTypes.filter(t => t !== type.id)
                            : [...settings.questionTypes, type.id]
                          if (newTypes.length > 0) updateSetting('questionTypes', newTypes)
                        }}
                      >
                        {isActive && <CheckCircleIcon className="w-5 h-5 quiz-type-icon" />}
                        {Icon && <Icon className="w-5 h-5 quiz-type-icon" />}
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {settings.questionTypes.length > 1 && (
                <div style={{ marginBottom: '28px' }}>
                  <span className="quiz-config-label block mb-2" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Cách kết hợp
                    <HelpTooltip placement="right" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">🧠</span><span className="ht-header-title">Cách kết hợp loại câu hỏi</span></div>
                        <div className="ht-body">
                          <p className="ht-desc">Áp dụng khi bạn bật nhiều hơn 1 loại câu hỏi.</p>
                          <div className="ht-options">
                            <div className="ht-opt"><span className="ht-opt-badge">Thông minh</span><span className="ht-opt-text">AI tự chọn dạng câu phù hợp nhất cho mỗi từ dựa trên điểm thành thạo. <em>Từ yếu → Điền từ nhiều hơn. Từ mạnh → Trắc nghiệm.</em></span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Xen kẽ đều</span><span className="ht-opt-text">Luân phiên lần lượt theo thứ tự: Trắc nghiệm → Điền từ → Nghe → lặp lại.</span></div>
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">💡</span><span><strong>Thông minh</strong> giúp bạn không mất thời gian vào từ đã thuộc quá rồi.</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <div className="flex p-1 mt-1 quiz-segmented-container">
                    <button
                      className={`flex-1 text-[15px] font-medium quiz-segmented-item ${
                        settings.combineStrategy === 'smart' ? 'quiz-segmented-active' : ''
                      }`}
                      style={{ padding: '12px 0', borderRadius: '6px' }}
                      onClick={() => updateSetting('combineStrategy', 'smart')}
                    >
                      Trộn thông minh
                    </button>
                    <button
                      className={`flex-1 text-[15px] font-medium quiz-segmented-item ${
                        settings.combineStrategy === 'round_robin' ? 'quiz-segmented-active' : ''
                      }`}
                      style={{ padding: '12px 0', borderRadius: '6px' }}
                      onClick={() => updateSetting('combineStrategy', 'round_robin')}
                    >
                      Xen kẽ đều
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '32px' }}>
                <div className="flex justify-between items-end mb-2" style={{ marginBottom: '12px' }}>
                  <span className="quiz-config-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    Số câu hỏi
                    <HelpTooltip placement="right" content={
                      <div>
                        <div className="ht-header"><span className="ht-header-icon">🔢</span><span className="ht-header-title">Số câu mỗi buổi luyện</span></div>
                        <div className="ht-body">
                          <div className="ht-options">
                            <div className="ht-opt"><span className="ht-opt-badge">10</span><span className="ht-opt-text">Ôn nhanh ~3 phút. Phù hợp lúc rảnh ngắn.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">20–30</span><span className="ht-opt-text">Buổi học chuẩn ~10–15 phút. Đủ để có cảm giác tiến bộ.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">50</span><span className="ht-opt-text">Học sâu ~25 phút. Tốt khi có nhiều thời gian.</span></div>
                            <div className="ht-opt"><span className="ht-opt-badge">Tất cả</span><span className="ht-opt-text">Luyện toàn bộ từ khả dụng. Số câu thực tế giới hạn bởi số từ hiện có.</span></div>
                          </div>
                          <div className="ht-tip"><span className="ht-tip-icon">📅</span><span>Học <strong>20–30 câu mỗi ngày</strong> đều đặn hiệu quả hơn gấp 3 lần so với học 100 câu/tuần.</span></div>
                        </div>
                      </div>
                    } />
                  </span>
                  <span className="text-[12px] text-gray-500">
                    {settings.questionCount > 50 ? availableCount : settings.questionCount} câu · {availableCount} từ khả dụng
                  </span>
                </div>
                <div className="flex p-1 mt-1 quiz-segmented-container">
                  {[10, 20, 30, 50, 999].map(num => {
                    const isDisabled = availableCount < 1
                    const isActive = settings.questionCount === num || (num === 999 && settings.questionCount > 50)
                    return (
                      <button
                        key={num}
                        disabled={isDisabled}
                        className={`flex-1 text-[15px] font-medium quiz-segmented-item ${
                          isActive ? 'quiz-segmented-active' : ''
                        }`}
                        style={{ padding: '12px 0', borderRadius: '6px' }}
                        onClick={() => updateSetting('questionCount', num)}
                      >
                        {num === 999 ? 'Tất cả' : num}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div className="quiz-config-toggles">
                <div className="quiz-toggle-card">
                  <div className="quiz-toggle-info-wrapper">
                    <div className="quiz-toggle-icon-bg">
                      <ArrowsRightLeftIcon className="w-5 h-5" />
                    </div>
                    <div className="quiz-toggle-info">
                      <span className="quiz-toggle-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        Trộn câu hỏi
                        <HelpTooltip placement="top" content={
                          <div>
                            <div className="ht-header"><span className="ht-header-icon">🔀</span><span className="ht-header-title">Trộn thứ tự câu hỏi</span></div>
                            <div className="ht-body">
                              <div className="ht-how">
                                <div className="ht-how-label">Tại sao cần bật?</div>
                                Khi tắt, não bạn có thể vô tình học theo vị trí ("câu 3 là apple") thay vì nhớ thực sự từ đó. Bật trộn giúp não tập truy xuất ngẫu nhiên — đúng cách não lưu trí nhớ.
                              </div>
                              <div className="ht-tip"><span className="ht-tip-icon">✅</span><span>Nên <strong>bật</strong> trong hầu hết trường hợp.</span></div>
                            </div>
                          </div>
                        } />
                      </span>
                    </div>
                  </div>
                  <button 
                    className={`ui-switch ${settings.shuffle ? 'active' : ''}`}
                    onClick={() => updateSetting('shuffle', !settings.shuffle)}
                    role="switch"
                    aria-checked={settings.shuffle}
                  >
                    <span className="ui-switch-knob" />
                  </button>
                </div>

                <div className="quiz-toggle-card">
                  <div className="quiz-toggle-info-wrapper">
                    <div className="quiz-toggle-icon-bg">
                      <ForwardIcon className="w-5 h-5" />
                    </div>
                    <div className="quiz-toggle-info">
                      <span className="quiz-toggle-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        Tự động chuyển
                        <HelpTooltip placement="top" content={
                          <div>
                            <div className="ht-header"><span className="ht-header-icon">⏩</span><span className="ht-header-title">Tự động sang câu tiếp</span></div>
                            <div className="ht-body">
                              <div className="ht-how">
                                <div className="ht-how-label">Cơ chế hoạt động</div>
                                <strong>Bật:</strong> sau khi trả lời đúng, đợi ~1.5 giây rồi tự chuyển sang câu kế. Không cần nhấn bất kỳ nút nào.<br/><br/>
                                <strong>Tắt:</strong> phải nhấn nút "Tiếp theo" thủ công — cho phép bạn đọc kỹ đáp án, ví dụ, phát âm trước khi tiếp tục.
                              </div>
                              <div className="ht-tip"><span className="ht-tip-icon">⚡</span><span>Bật khi muốn tốc độ cao. Tắt khi muốn hiểu sâu từng từ.</span></div>
                            </div>
                          </div>
                        } />
                      </span>
                    </div>
                  </div>
                  <button 
                    className={`ui-switch ${settings.autoNext ? 'active' : ''}`}
                    onClick={() => updateSetting('autoNext', !settings.autoNext)}
                    role="switch"
                    aria-checked={settings.autoNext}
                  >
                    <span className="ui-switch-knob" />
                  </button>
                </div>

                <div className="quiz-toggle-card">
                  <div className="quiz-toggle-info-wrapper">
                    <div className="quiz-toggle-icon-bg">
                      <SpeakerWaveIcon className="w-5 h-5" />
                    </div>
                    <div className="quiz-toggle-info">
                      <span className="quiz-toggle-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        Tự động phát âm
                        <HelpTooltip placement="top" content={
                          <div>
                            <div className="ht-header"><span className="ht-header-icon">🔊</span><span className="ht-header-title">Tự động phát âm</span></div>
                            <div className="ht-body">
                              <div className="ht-how">
                                <div className="ht-how-label">Cơ chế hoạt động</div>
                                Ngay khi câu hỏi xuất hiện, hệ thống tự phát âm từ tiếng Anh qua Text-to-Speech (TTS) với giọng đọc đã cài đặt (Anh–Mỹ hoặc Anh–Anh).
                              </div>
                              <div className="ht-tip"><span className="ht-tip-icon">🎧</span><span>Bật để luyện nghe <strong>thụ động</strong> — não quen âm thanh của từ mà không cần cố tình lắng nghe.</span></div>
                            </div>
                          </div>
                        } />
                      </span>
                    </div>
                  </div>
                  <button 
                    className={`ui-switch ${autoPlayAudio ? 'active' : ''}`}
                    onClick={toggleAutoPlayAudio}
                    role="switch"
                    aria-checked={autoPlayAudio}
                  >
                    <span className="ui-switch-knob" />
                  </button>
                </div>

                <div className={`quiz-toggle-card ${!supportsRetryOnWrong(settings.questionTypes) ? 'quiz-disabled-wrapper quiz-disabled-card' : ''}`} title={!supportsRetryOnWrong(settings.questionTypes) ? 'Chỉ hỗ trợ cho dạng điền từ' : ''}>
                  <div className="quiz-toggle-info-wrapper">
                    <div className="quiz-toggle-icon-bg">
                      <CommandLineIcon className="w-5 h-5" />
                    </div>
                    <div className="quiz-toggle-info">
                      <div className="flex items-center gap-1">
                        <span className={`quiz-toggle-title ${!supportsRetryOnWrong(settings.questionTypes) ? 'text-gray-400 dark:text-gray-500' : ''}`}>Gõ lại khi sai</span>
                        {!supportsRetryOnWrong(settings.questionTypes) && (
                          <InformationCircleIcon className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    className={`ui-switch ${settings.requireRetypeOnWrong ? 'active' : ''}`}
                    onClick={() => updateSetting('requireRetypeOnWrong', !settings.requireRetypeOnWrong)}
                    role="switch"
                    aria-checked={settings.requireRetypeOnWrong}
                    disabled={!supportsRetryOnWrong(settings.questionTypes)}
                  >
                    <span className="ui-switch-knob" />
                  </button>
                </div>

                <div className="quiz-toggle-card" title="Hiển thị ảnh minh họa nếu từ vựng có ảnh">
                  <div className="quiz-toggle-info-wrapper">
                    <div className="quiz-toggle-icon-bg">
                      <PhotoIcon className="w-5 h-5" />
                    </div>
                    <div className="quiz-toggle-info">
                      <span className="quiz-toggle-title" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        Hiển thị ảnh
                        <HelpTooltip placement="top" content={
                          <div>
                            <div className="ht-header"><span className="ht-header-icon">🖼️</span><span className="ht-header-title">Hiển thị ảnh minh họa</span></div>
                            <div className="ht-body">
                              <div className="ht-how">
                                <div className="ht-how-label">Cơ chế hoạt động</div>
                                Nếu từ vựng có ảnh đính kèm, ảnh sẽ xuất hiện trong câu hỏi. Ảnh giúp tạo "liên kết hình ảnh" trong não — một trong những kỹ thuật ghi nhớ mạnh nhất (Visual Memory Encoding).
                              </div>
                              <div className="ht-tip"><span className="ht-tip-icon">🧠</span><span>Não ghi nhớ hình ảnh nhanh hơn chữ tới <strong>60.000 lần</strong>. Hãy thêm ảnh cho từ vựng của bạn!</span></div>
                            </div>
                          </div>
                        } />
                      </span>
                    </div>
                  </div>
                  <button 
                    className={`ui-switch ${settings.showImageInQuestion ? 'active' : ''}`}
                    onClick={() => updateSetting('showImageInQuestion', !settings.showImageInQuestion)}
                    role="switch"
                    aria-checked={settings.showImageInQuestion}
                  >
                    <span className="ui-switch-knob" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!canStart && (
            <p className="quiz-warning">
              ⚠ Cần ít nhất 1 từ vựng{settings.filterDeck || settings.filterLevel || settings.filterTopic || settings.filterPOS ? ' (thử bỏ bộ lọc)' : ''}.
            </p>
          )}

          <div className="quiz-start-actions">
            <button className="quiz-start-btn quiz-btn-primary" onClick={startQuiz} disabled={!canStart}>
              Bắt đầu Luyện tập
            </button>
            <button className="quiz-btn-secondary flex items-center justify-center gap-2 px-6 rounded-xl h-[48px]" onClick={() => setShowSettings(true)}>
              <Cog6ToothIcon className="w-5 h-5" />
              Cài đặt nâng cao
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

  // Derived states for feedback
  const hasSubmittedCurrentQuestion = answered;
  const isCurrentAnswerCorrect = q.type === 'fill' ? fillCorrect === true : (q.type === 'listen' || q.type === 'multiple' ? selected === q.correctIdx : false);
  const isUnknownAnswer = selected === -1;
  const isFillWrongAndRequiresRetype = q.type === 'fill' && fillCorrect === false && activeSettings?.requireRetypeOnWrong;
  const isAutoNextScheduled = isCurrentAnswerCorrect && (activeSettings || settings).autoNext;
  
  const shouldShowDetailedFeedback = hasSubmittedCurrentQuestion;
  const shouldShowContinueButton = hasSubmittedCurrentQuestion && !isAutoNextScheduled && !isFillWrongAndRequiresRetype;
  const isTargetHidden = !hasSubmittedCurrentQuestion && (q.type === 'listen' || (q.type === 'fill' && q.direction === 'vi2en'));

  function renderQuestion() {
    if (q.type === 'fill') return renderFillQuestion()
    if (q.type === 'listen') return renderListenQuestion()
    return renderMultipleQuestion()
  }

  function renderMultipleQuestion() {
    if (q.options.length === 1) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>
            Đáp án: <strong style={{ color: 'var(--accent)', fontSize: '22px' }}>{q.correctAnswer}</strong>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            {!answered && (
              <>
                <button className="btn-outline quiz-dont-know" onClick={handleDontKnow} style={{ width: 'auto' }}>
                  Tôi không nhớ
                </button>
                <button className="btn-primary" onClick={() => {
                  setAnswered(true)
                  setSelected(0)
                  recordQuestionResult(q, true, false)
                  setCorrectCount(c => c + 1)
                  setTotalAnswered(t => t + 1)
                  // No submitProgress here to prevent inflating mastery
                  if (settings.autoNext) {
                    autoNextTimer.current = setTimeout(goNext, 800)
                  }
                }}>
                  <CheckIcon className="icon icon-inline" /> Tôi đã nhớ
                </button>
              </>
            )}
          </div>
        </div>
      )
    }

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
            {q.options.length + 1}. Tôi không biết
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
            placeholder={q.direction === 'en2vi' ? 'Nhập nghĩa tiếng Việt...' : 'Nhập từ tiếng Anh...'}
            value={fillInput}
            onChange={e => {
              setFillInput(e.target.value)
              if (fillNearMissMsg) setFillNearMissMsg('')
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleFillSubmit() }}
            disabled={answered && !(activeSettings?.requireRetypeOnWrong && fillCorrect === false)}
          />
          {fillNearMissMsg && (
            <div style={{ color: '#D97706', fontSize: '14px', marginTop: '8px', fontWeight: 500 }}>
              ⚠ {fillNearMissMsg}
            </div>
          )}
          {answered && activeSettings?.requireRetypeOnWrong && fillCorrect === false && (
            <div style={{ color: '#DC2626', fontSize: '14px', marginTop: '8px', fontWeight: 500 }}>
              Hãy gõ lại đáp án đúng để tiếp tục.
            </div>
          )}
          {!answered && (
            <button type="button" className="quiz-fill-submit" onClick={handleFillSubmit} disabled={!fillInput.trim()}>
              Kiểm tra
            </button>
          )}
        </div>
        {!answered && (
          <button type="button" className="quiz-dont-know" onClick={handleDontKnow} style={{ marginTop: 12 }}>
            Hiển thị đáp án
          </button>
        )}
      </div>
    )
  }

  function renderListenQuestion() {
    return (
      <>
        <div className="quiz-listen-prompt">
          <button className="quiz-listen-replay" onClick={() => speak(q.vocab.word, { mode: 'manual', source: 'quiz-listen-replay', ownerId: 'quiz-session' })}>
            <SpeakerWaveIcon className="icon" />
            <span>Nghe lại</span>
          </button>
          <p className="quiz-listen-hint">Nghe phát âm và chọn đáp án đúng</p>
        </div>
        {q.options.length === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ fontSize: '18px', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center' }}>
              Đáp án: <strong style={{ color: 'var(--accent)', fontSize: '22px' }}>{q.correctAnswer}</strong>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              {!answered && (
                <>
                  <button className="btn-outline quiz-dont-know" onClick={handleDontKnow} style={{ width: 'auto' }}>
                    Tôi không nhớ
                  </button>
                  <button className="btn-primary" onClick={() => {
                    setAnswered(true)
                    setSelected(0)
                    recordQuestionResult(q, true, false)
                    setCorrectCount(c => c + 1)
                    setTotalAnswered(t => t + 1)
                    // No submitProgress here to prevent inflating mastery
                    if (settings.autoNext) {
                      autoNextTimer.current = setTimeout(goNext, 800)
                    }
                  }}>
                    <CheckIcon className="icon icon-inline" /> Tôi đã nhớ
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
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
                {q.options.length + 1}. Tôi không biết
              </button>
            )}
          </>
        )}
      </>
    )
  }

  function renderResultBanner() {
    if (!hasSubmittedCurrentQuestion) return null;
    
    if (isCurrentAnswerCorrect) {
      return (
        <div className="quiz-feedback-section" role="status" aria-live="polite">
          <div className="quiz-feedback-status" style={{ color: '#15803d', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckIcon className="icon" style={{ width: 24, height: 24 }} /> 
            <strong>Tuyệt vời! Chính xác.</strong>
          </div>
        </div>
      );
    }

    const message = isUnknownAnswer 
      ? 'Chưa nhớ cũng không sao. Hãy xem lại đáp án nhé!' 
      : 'Chưa chính xác. Không sao, cố gắng lên nhé!';

    return (
      <div className="quiz-feedback-section" role="status" aria-live="polite" style={{ marginTop: '16px' }}>
        <div className="quiz-feedback-status" style={{ color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <XMarkIcon className="icon" style={{ width: 24, height: 24, marginTop: '2px', flexShrink: 0 }} /> 
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{message}</div>
            {!shouldShowDetailedFeedback && (
              <div style={{ fontSize: '15px' }}>Đáp án đúng: <strong>{q.correctAnswer}</strong></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderContinueAction() {
    if (!shouldShowContinueButton) return null;
    return (
      <div className="quiz-continue-action-container">
        <button className="quiz-continue-btn" onClick={handleNext}>
          Tiếp tục
        </button>
      </div>
    );
  }

  function renderSettingsModal() {
    if (!showSettings) return null

    const isPracticeMode = sessionMode === 'wrong-practice'
    const hasRestartRequiredChanges = Boolean(
      started && activeSettings && (
        settings.mode !== activeSettings.mode ||
        (!isPracticeMode && settings.questionCount !== activeSettings.questionCount) ||
        (!isPracticeMode && settings.shuffle !== activeSettings.shuffle) ||
        settings.filterDeck !== activeSettings.filterDeck ||
        settings.filterLevel !== activeSettings.filterLevel ||
        settings.filterTopic !== activeSettings.filterTopic ||
        settings.filterPOS !== activeSettings.filterPOS ||
        settings.filterTier !== activeSettings.filterTier ||
        settings.sourceMode !== activeSettings.sourceMode ||
        settings.filterStarredOnly !== activeSettings.filterStarredOnly ||
        settings.requireRetypeOnWrong !== activeSettings.requireRetypeOnWrong ||
        JSON.stringify(settings.questionTypes) !== JSON.stringify(activeSettings.questionTypes)
      )
    )

    const hasGroupBChanged = Boolean(
      started && activeSettings && (
        settings.autoNext !== activeSettings.autoNext
      )
    )

    return (
      <div className="modal-overlay" onClick={() => setShowSettings(false)}>
        <div className="modal quiz-settings-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header quiz-settings-header">
            <h3>Cài đặt Quiz</h3>
            <button className="quiz-close-btn" onClick={() => setShowSettings(false)}>
              <XMarkIcon className="icon" />
            </button>
          </div>

          {(() => {
            if (started && (hasRestartRequiredChanges || hasGroupBChanged)) {
              return (
                <div className="quiz-settings-notice" style={{ padding: '12px 24px', backgroundColor: hasRestartRequiredChanges ? '#FEF9C3' : '#DCFCE7', color: hasRestartRequiredChanges ? '#854D0E' : '#166534', fontSize: '14px', borderBottom: hasRestartRequiredChanges ? '1px solid #FEF08A' : '1px solid #BBF7D0' }}>
                  {hasRestartRequiredChanges ? (
                    <>⚠ Thay đổi này sẽ áp dụng khi bạn bắt đầu lượt Quiz mới.</>
                  ) : (
                    <>✓ Đã áp dụng cho phiên hiện tại.</>
                  )}
                </div>
              )
            }
            return null
          })()}

          <div className="modal-body quiz-settings-body">
            {/* CỘT 1 */}
            <div className="quiz-settings-col">
              {/* Retype on Wrong */}
              <label className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.requireRetypeOnWrong}
                  onChange={e => setSettings({ ...settings, requireRetypeOnWrong: e.target.checked })}
                />
                Bắt buộc gõ lại khi sai (Điền từ)
              </label>

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
                <label className={`quiz-setting-option ${settings.showImageInQuestion ? 'active' : ''}`} title="Hiển thị ảnh minh họa nếu từ vựng có ảnh">
                  <input type="checkbox" checked={settings.showImageInQuestion}
                    onChange={() => setSettings(s => ({ ...s, showImageInQuestion: !s.showImageInQuestion }))} />
                  <span>🖼️ Hiển thị ảnh trong câu hỏi</span>
                </label>
              </div>

              {/* Âm thanh */}
              <div className="quiz-settings-section">
                <h4>Âm thanh</h4>
                <div className="quiz-setting-option" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 500 }}>Giọng phát âm</span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{ttsAccent === 'en-GB' ? 'Anh-Anh' : 'Anh-Mỹ'}</span>
                  </div>
                  <button 
                    className="btn-outline" 
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    onClick={(e) => { e.stopPropagation(); setIsTTSSettingsOpen(true); }}
                  >
                    Đổi giọng
                  </button>
                </div>
              </div>
            </div>

            {/* CỘT 2 */}
            <div className="quiz-settings-col">

            {/* Filters */}
            <div className="quiz-settings-section">
              <h4>Lọc từ vựng</h4>
              <div className="quiz-filter-grid">
                <div className="quiz-filter-item">
                  <label>Nguồn (Chế độ)</label>
                  <select value={settings.sourceMode} onChange={e => updateSetting('sourceMode', e.target.value)}>
                    <option value="random">Ngẫu nhiên (Mặc định)</option>
                    <option value="lowest_score">Từ điểm thấp nhất</option>
                    <option value="overdue">Đến hạn ôn tập (Quên lãng)</option>
                    <option value="newest">Mới thêm gần đây</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </div>
                <div className="quiz-filter-item">
                  <label>Độ thành thạo</label>
                  <select value={settings.filterTier} onChange={e => setSettings(s => ({ ...s, filterTier: e.target.value }))}>
                    <option value="all">Tất cả</option>
                    <option value="not_started">Chưa học</option>
                    <option value="learning">Đang học</option>
                    <option value="familiar">Đã quen</option>
                    <option value="mastered">Thành thạo</option>
                  </select>
                </div>
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

            </div>
          </div>
          <div className="modal-footer quiz-settings-footer">
            <button className="btn-outline quiz-reset-btn" onClick={() => {
              setSettings({ ...defaultSettings })
            }} style={{ color: '#EF4444' }}>
              <ArrowPathIcon className="icon icon-inline" /> Đặt lại mặc định
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {hasRestartRequiredChanges && (
                <button className="btn-outline" onClick={() => {
                  setShowSettings(false)
                  startQuiz()
                }}>
                  Bắt đầu lại Quiz với cài đặt mới
                </button>
              )}
              <button className="btn-primary" onClick={() => setShowSettings(false)}>
                Đóng
              </button>
            </div>
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
        <div className={`quiz-question-top-layout ${settings.showImageInQuestion && q.vocab.imageUrl ? 'has-question-image' : 'without-question-image'} ${shouldShowDetailedFeedback ? 'showing-detailed-feedback' : ''}`}>
          {settings.showImageInQuestion && q.vocab.imageUrl && (
            <div className="quiz-question-image-col">
              <QuizQuestionImage imageUrl={q.vocab.imageUrl} questionId={getVocabId(q.vocab)} />
            </div>
          )}
          <div className="quiz-question-content-col">
            <div className="quiz-question-main-area">
              <div className="quiz-question-text">
                {q.type === 'listen' ? (
                  <h2 className="quiz-word quiz-listen-word">
                    <SpeakerWaveIcon className="icon" style={{ width: 32, height: 32 }} />
                    {!isTargetHidden ? q.vocab.word : '🔊 ???'}
                  </h2>
                ) : (
                  <h2 className="quiz-word">
                    {isTargetHidden ? '✏️ ___' : q.questionText}
                  </h2>
                )}
                {q.type !== 'listen' && (q.vocab.type || q.vocab.pronunciation) && (
                  <div className="quiz-word-meta" style={{ visibility: isTargetHidden ? 'hidden' : 'visible' }}>
                    {q.vocab.type && <span>Loại từ: <strong>{q.vocab.type}</strong></span>}
                    {q.vocab.type && q.vocab.pronunciation && <span className="quiz-word-meta-divider">|</span>}
                    {q.vocab.pronunciation && <span>Phiên âm: <strong>{q.vocab.pronunciation}</strong></span>}
                  </div>
                )}
              </div>
              
              {shouldShowDetailedFeedback && (
                <div className="quiz-feedback-inline-wrapper">
                  <VocabularyFeedbackCard 
                    vocab={q.vocab} 
                    statusText={
                      <div className="quiz-feedback-status-text">
                        Đáp án đúng là: <strong>{q.direction === 'en2vi' ? q.vocab.meanings.join(', ') : q.vocab.word}</strong>
                      </div>
                    }
                    variant="inline"
                  />
                </div>
              )}
            </div>

            <div className="quiz-question-actions">
              {!hasSubmittedCurrentQuestion && (
                <button 
                  className={`quiz-action-icon ${hintUsed ? 'hint-active' : ''}`} 
                  onClick={() => {
                    setHintUsed(true)
                    setShowHintText(true)
                  }} 
                  title="Sử dụng gợi ý"
                >
                  <LightBulbIcon className="icon" style={{ color: hintUsed ? '#EAB308' : undefined }} />
                </button>
              )}
              {q.type !== 'listen' && (
                <>
                  <button
                    className={`quiz-action-icon ${autoPlayAudio ? 'active' : ''}`}
                    onClick={toggleAutoPlayAudio}
                    title={autoPlayAudio ? "Tắt tự động phát âm" : "Bật tự động phát âm"}
                    aria-label={autoPlayAudio ? "Tắt tự động phát âm" : "Bật tự động phát âm"}
                    aria-pressed={autoPlayAudio}
                  >
                    <div className="quiz-auto-icon-badge" style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      border: '1px solid currentColor',
                      borderRadius: '4px',
                      padding: '0 4px',
                      lineHeight: '16px',
                      opacity: autoPlayAudio ? 1 : 0.5,
                      color: autoPlayAudio ? 'var(--accent)' : 'inherit'
                    }}>
                      AUTO
                    </div>
                  </button>
                  <button className="quiz-action-icon" onClick={() => speak(q.vocab.word, { mode: 'manual', source: 'quiz-question', ownerId: 'quiz-session' })} title="Phát âm" aria-label="Phát âm">
                    <SpeakerWaveIcon className="icon" />
                  </button>
                </>
              )}
              <button
                className={`quiz-action-icon ${isStarred ? 'starred' : ''}`}
                onClick={toggleStar}
                title="Đánh dấu"
                aria-label="Đánh dấu"
              >
                <StarIcon className="icon" />
              </button>
              <button className="quiz-action-icon" title="Chỉnh sửa" aria-label="Chỉnh sửa" onClick={() => onEditWord(q.vocab)}>
                <PencilSquareIcon className="icon" />
              </button>
            </div>
          </div>
        </div>

        {showHintText && !answered && (
          <div className="quiz-hint-box" style={{ padding: '12px 16px', background: '#FEF9C3', color: '#854D0E', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', border: '1px solid #FEF08A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
              <LightBulbIcon className="icon" style={{ width: 18, height: 18 }} /> Gợi ý
            </div>
            {q.direction === 'en2vi'
              ? `Nghĩa của từ này bắt đầu bằng: ${q.correctAnswer.slice(0, 2)}...` 
              : `Từ này bắt đầu bằng: ${q.correctAnswer.slice(0, 2)}...`}
            {q.vocab.examples?.[0] && (
              <div style={{ marginTop: '4px', fontStyle: 'italic', opacity: 0.9 }}>
                {`Ví dụ: "${q.direction === 'en2vi' ? q.vocab.examples[0].en : q.vocab.examples[0].vi}"`}
              </div>
            )}
          </div>
        )}

        {/* Question Content */}
        {renderQuestion()}

        {/* Unified Feedback & Continue Actions */}
        {renderResultBanner()}
        {renderContinueAction()}
      </div>

      {/* Bottom Stats */}
      <div className="quiz-bottom-stats">
        <span>Đã hoàn thành: {correctCount} / {activeSettings?.questionCount || questions.length}</span>
        <span>•</span>
        <span>Câu hỏi: {Math.min(currentIdx + 1, activeSettings?.questionCount || questions.length)} / {activeSettings?.questionCount || questions.length}</span>
      </div>

      {/* Settings Modal */}
      {renderSettingsModal()}

      {/* TTS Settings Modal */}
      {isTTSSettingsOpen && (
        <TTSSettingsModal onClose={() => setIsTTSSettingsOpen(false)} />
      )}
    </div>
  )
}
