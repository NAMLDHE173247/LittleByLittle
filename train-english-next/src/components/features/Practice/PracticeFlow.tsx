import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import AudioVisualizer from './AudioVisualizer'
import './PracticeFlow.css'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  PlayIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/AuthContext'

const BASE_URL = ''
const PROGRESS_API_URL = `${BASE_URL}/api/progress`

interface PracticeFlowProps {
  onExit: () => void;
  decks?: any[];
}

export default function PracticeFlow({ onExit, decks = [] }: PracticeFlowProps) {
  const { authHeaders } = useAuth()
  // Setup state
  const [step, setStep] = useState<number>(0) // 0 = Setup, 1-6 = Steps, 7 = Complete
  const [wordCount, setWordCount] = useState<number>(8)
  const [customWordCount, setCustomWordCount] = useState<string>('')
  
  // Custom Filters
  const [sourceMode, setSourceMode] = useState<string>('lowest_score')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterDeck, setFilterDeck] = useState<string>('')

  // Settings
  const [enablePoints, setEnablePoints] = useState<boolean>(true)
  const [enableRepeat, setEnableRepeat] = useState<boolean>(true)
  
  // Selected steps
  const [selectedSteps, setSelectedSteps] = useState({
    1: true, // Flashcard
    2: true, // Overview
    3: true, // Quiz Text
    4: true, // Quiz Âm thanh
    5: true, // Nhập từ
    6: true, // Phát âm
  })

  // Data
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  // Step 1: Flashcard state
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isCardExpanded, setIsCardExpanded] = useState(false)
  const [autoPlaySound, setAutoPlaySound] = useState(true)

  
  const speakWord = useCallback((text: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'))
    if (enVoice) utterance.voice = enVoice
    window.speechSynthesis.speak(utterance)
  }, [])

  // Step 3: Quiz Text state
  const [quizQueue, setQuizQueue] = useState<any[]>([])
  const [currentQuizWord, setCurrentQuizWord] = useState<any | null>(null)
  const [quizOptions, setQuizOptions] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const setupNextQuizWord = useCallback((wordObj: any, currentQueue: any[], allWords: any[]) => {
    setCurrentQuizWord(wordObj)
    setSelectedAnswer(null)
    
    // Generate options
    const correct = wordObj.word
    const others = allWords.filter(w => w.word !== correct).map(w => w.word)
    const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 3)
    const options = [correct, ...shuffledOthers].sort(() => 0.5 - Math.random())
    setQuizOptions(options)
  }, [])

  useEffect(() => {
    if (step === 3 && words.length > 0) {
      setQuizCompleted(false)
      const queue = [...words]
      setQuizQueue(queue)
      setupNextQuizWord(queue[0], queue, words)
    }
  }, [step, words, setupNextQuizWord])

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer)
    const isCorrect = answer === currentQuizWord.word
    
    if (enablePoints) {
       fetch(`${PROGRESS_API_URL}/review`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', ...authHeaders() },
         body: JSON.stringify({ wordId: currentQuizWord._id, skill: 'recall', correct: isCorrect })
       }).catch(err => console.error(err))
    }

    setTimeout(() => {
      let newQueue = [...quizQueue]
      newQueue.shift()

      if (!isCorrect && enableRepeat) {
        newQueue.push(currentQuizWord)
      }

      setQuizQueue(newQueue)
      if (newQueue.length > 0) {
        setupNextQuizWord(newQueue[0], newQueue, words)
      } else {
        setCurrentQuizWord(null)
        setQuizCompleted(true)
      }
    }, 1500)
  }

  
  // Step 4: Audio Quiz state
  const [audioQuizQueue, setAudioQuizQueue] = useState<any[]>([])
  const [currentAudioQuizWord, setCurrentAudioQuizWord] = useState<any | null>(null)
  const [audioQuizOptions, setAudioQuizOptions] = useState<string[]>([])
  const [audioSelectedAnswer, setAudioSelectedAnswer] = useState<string | null>(null)
  const [audioQuizCompleted, setAudioQuizCompleted] = useState(false)

  const setupNextAudioQuizWord = useCallback((wordObj: any, currentQueue: any[], allWords: any[]) => {
    setCurrentAudioQuizWord(wordObj)
    setAudioSelectedAnswer(null)
    
    // Generate options (English words)
    const correct = wordObj.word
    const others = allWords.filter(w => w.word !== correct).map(w => w.word)
    const shuffledOthers = others.sort(() => 0.5 - Math.random()).slice(0, 3)
    const options = [correct, ...shuffledOthers].sort(() => 0.5 - Math.random())
    setAudioQuizOptions(options)

    // Play sound automatically
    setTimeout(() => {
      speakWord(correct)
    }, 500)
  }, [speakWord])

  useEffect(() => {
    if (step === 4 && words.length > 0) {
      setAudioQuizCompleted(false)
      const queue = [...words]
      setAudioQuizQueue(queue)
      setupNextAudioQuizWord(queue[0], queue, words)
    }
  }, [step, words, setupNextAudioQuizWord])

  const handleAudioQuizAnswer = (answer: string) => {
    if (audioSelectedAnswer) return;
    setAudioSelectedAnswer(answer)
    const isCorrect = answer === currentAudioQuizWord.word
    
    if (enablePoints) {
       fetch(`${PROGRESS_API_URL}/review`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', ...authHeaders() },
         body: JSON.stringify({ wordId: currentAudioQuizWord._id, skill: 'listening', correct: isCorrect })
       }).catch(err => console.error(err))
    }

    setTimeout(() => {
      let newQueue = [...audioQuizQueue]
      newQueue.shift()

      if (!isCorrect && enableRepeat) {
        newQueue.push(currentAudioQuizWord)
      }

      setAudioQuizQueue(newQueue)
      if (newQueue.length > 0) {
        setupNextAudioQuizWord(newQueue[0], newQueue, words)
      } else {
        setCurrentAudioQuizWord(null)
        setAudioQuizCompleted(true)
      }
    }, 1500)
  }

  
  // Step 5: Typing Quiz state
  const [typingQueue, setTypingQueue] = useState<any[]>([])
  const [currentTypingWord, setCurrentTypingWord] = useState<any | null>(null)
  const [typingInput, setTypingInput] = useState<string>('')
  const [typingStatus, setTypingStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [typingCompleted, setTypingCompleted] = useState(false)

  const setupNextTypingWord = useCallback((wordObj: any) => {
    setCurrentTypingWord(wordObj)
    setTypingInput('')
    setTypingStatus('idle')
    
    // Auto play sound hint
    setTimeout(() => {
      speakWord(wordObj.word)
    }, 500)
  }, [speakWord])

  useEffect(() => {
    if (step === 5 && words.length > 0) {
      setTypingCompleted(false)
      const queue = [...words]
      setTypingQueue(queue)
      setupNextTypingWord(queue[0])
    }
  }, [step, words, setupNextTypingWord])

  const handleTypingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (typingStatus !== 'idle') return
    
    const isCorrect = typingInput.trim().toLowerCase() === currentTypingWord.word.toLowerCase()
    setTypingStatus(isCorrect ? 'correct' : 'incorrect')
    
    if (enablePoints) {
       fetch(`${PROGRESS_API_URL}/review`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', ...authHeaders() },
         body: JSON.stringify({ wordId: currentTypingWord._id, skill: 'writing', correct: isCorrect })
       }).catch(err => console.error(err))
    }

    setTimeout(() => {
      let newQueue = [...typingQueue]
      newQueue.shift()

      if (!isCorrect && enableRepeat) {
        newQueue.push(currentTypingWord)
      }

      setTypingQueue(newQueue)
      if (newQueue.length > 0) {
        setupNextTypingWord(newQueue[0])
      } else {
        setCurrentTypingWord(null)
        setTypingCompleted(true)
      }
    }, isCorrect ? 1500 : 2500)
  }

  
  // Step 6: Speaking Quiz state
  const [speakingQueue, setSpeakingQueue] = useState<any[]>([])
  const [currentSpeakingWord, setCurrentSpeakingWord] = useState<any | null>(null)
  const [speakingStatus, setSpeakingStatus] = useState<'idle' | 'listening' | 'correct' | 'incorrect'>('idle')
  const [transcriptResult, setTranscriptResult] = useState<string>('')
  const [speakingCompleted, setSpeakingCompleted] = useState(false)

  const setupNextSpeakingWord = useCallback((wordObj: any) => {
    setCurrentSpeakingWord(wordObj)
    setSpeakingStatus('idle')
    setTranscriptResult('')
  }, [])

  useEffect(() => {
    if (step === 6 && words.length > 0) {
      setSpeakingCompleted(false)
      const queue = [...words]
      setSpeakingQueue(queue)
      setupNextSpeakingWord(queue[0])
    }
  }, [step, words, setupNextSpeakingWord])

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói. Vui lòng sử dụng Google Chrome hoặc Edge.");
      return;
    }

    setSpeakingStatus('listening')
    setTranscriptResult('')

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setTranscriptResult(transcript)
      handleSpeakingResult(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error(event.error)
      setSpeakingStatus('idle')
      alert("Không thể nhận diện giọng nói hoặc bạn chưa cấp quyền Micro. Vui lòng thử lại.")
    }

    recognition.start()
  }

  const handleSpeakingResult = (transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().replace(/[.,!?]/g, '').trim()
    const targetWord = currentSpeakingWord.word.toLowerCase().trim()
    
    // Chấp nhận nếu đọc chính xác hoặc câu nói có chứa từ đó
    const isCorrect = normalizedTranscript === targetWord || normalizedTranscript.split(' ').includes(targetWord)
    
    setSpeakingStatus(isCorrect ? 'correct' : 'incorrect')
    
    if (enablePoints) {
       fetch(`${PROGRESS_API_URL}/review`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', ...authHeaders() },
         body: JSON.stringify({ wordId: currentSpeakingWord._id, skill: 'pronunciation', correct: isCorrect })
       }).catch(err => console.error(err))
    }

    setTimeout(() => {
      let newQueue = [...speakingQueue]
      newQueue.shift()

      if (!isCorrect && enableRepeat) {
        newQueue.push(currentSpeakingWord)
      }

      setSpeakingQueue(newQueue)
      if (newQueue.length > 0) {
        setupNextSpeakingWord(newQueue[0])
      } else {
        setCurrentSpeakingWord(null)
        setSpeakingCompleted(true)
      }
    }, 2500)
  }

  // Calculate total active steps for progress bar
  const activeStepKeys = Object.entries(selectedSteps)
    .filter(([_, isActive]) => isActive)
    .map(([key, _]) => parseInt(key))
    .sort()

  const startPractice = async () => {
    const finalCount = customWordCount ? parseInt(customWordCount) : wordCount
    if (!finalCount || finalCount < 1) return

    setLoading(true)
    try {
      const url = new URL(`${PROGRESS_API_URL}/practice-words`, window.location.origin)
      url.searchParams.append('count', finalCount.toString())
      url.searchParams.append('mode', sourceMode)
      url.searchParams.append('tier', filterTier)
      if (filterDeck) url.searchParams.append('deckId', filterDeck)

      const res = await fetch(url.toString(), { headers: authHeaders() })
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        setWords(json.data)
        setCurrentWordIndex(0)
        setIsCardExpanded(false)
        // Jump to first active step, or complete if none
        if (activeStepKeys.length > 0) {
          setStep(activeStepKeys[0])
        } else {
          setStep(7)
        }
      } else {
        alert('Không tìm thấy từ vựng nào để luyện tập với bộ lọc này!')
      }
    } catch (err) {
      alert('Lỗi kết nối server!')
    } finally {
      setLoading(false)
    }
  }

  const goNextStep = () => {
    const currentIndex = activeStepKeys.indexOf(step)
    if (currentIndex >= 0 && currentIndex < activeStepKeys.length - 1) {
      setStep(activeStepKeys[currentIndex + 1])
    } else {
      setStep(7) // Complete
    }
  }

  const goPrevStep = () => {
    const currentIndex = activeStepKeys.indexOf(step)
    if (currentIndex > 0) {
      setStep(activeStepKeys[currentIndex - 1])
    }
  }

  const toggleStep = (stepNum: keyof typeof selectedSteps) => {
    setSelectedSteps(prev => ({
      ...prev,
      [stepNum]: !prev[stepNum]
    }))
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && step === 7) {
            setStep(0)
        }
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        if (step === 1) setIsCardExpanded(prev => !prev)
        else if (step === 2) goNextStep()
      } else if (e.key === 'Enter') {
        if (step === 1) goNextStep()
        else if (step === 3 && quizCompleted) goNextStep()
        else if (step === 4 && audioQuizCompleted) goNextStep()
        else if (step === 5 && typingCompleted) goNextStep()
        else if (step === 6 && speakingCompleted) goNextStep()
        else if (step === 7) setStep(0)
      } else if (['1','2','3','4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1
        if (step === 3 && !selectedAnswer && quizOptions[idx]) {
          handleQuizAnswer(quizOptions[idx])
        } else if (step === 4 && !audioSelectedAnswer && audioQuizOptions[idx]) {
          handleAudioQuizAnswer(audioQuizOptions[idx])
        }
      } else if (e.key === 'ArrowRight') {
         if (step === 1 && currentWordIndex < words.length - 1) {
            setCurrentWordIndex(prev => prev + 1); setIsCardExpanded(false)
         }
      } else if (e.key === 'ArrowLeft') {
         if (step === 1 && currentWordIndex > 0) {
            setCurrentWordIndex(prev => prev - 1); setIsCardExpanded(false)
         }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, currentWordIndex, words.length, isCardExpanded, quizOptions, selectedAnswer, audioQuizOptions, audioSelectedAnswer, quizCompleted, audioQuizCompleted, typingCompleted, speakingCompleted])
  // Auto play sound when index changes
  useEffect(() => {
    if (step === 1 && words.length > 0 && autoPlaySound) {
      const timeoutId = setTimeout(() => {
        speakWord(words[currentWordIndex].word)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [currentWordIndex, step, words, autoPlaySound, speakWord])

  useEffect(() => {
    if (step === 7) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      })
    }
  }, [step])

  // ===== RENDER SETUP SCREEN =====
  if (step === 0) {
    return (
      <div className="practice-container">
        
        <div className="practice-setup wide-setup">
          <div className="practice-setup-card wide-card">
            <div className="practice-setup-header">
              <div className="practice-setup-icon">
                <AcademicCapIcon className="icon" />
              </div>
              <div className="practice-setup-title-group">
                <h2 className="practice-setup-title">Luyện tập Từ vựng</h2>
                <p className="practice-setup-subtitle">Tùy chỉnh danh sách và các bước để bắt đầu luyện tập</p>
              </div>
            </div>

            <div className="setup-grid wide-grid">
              {/* CỘT 1: Nguồn từ vựng & Số lượng */}
              <div className="setup-col">
                <div className="setup-section">
                  <label className="setup-label">Nguồn từ vựng (Chế độ)</label>
                  <select 
                    className="setup-select"
                    value={sourceMode}
                    onChange={e => setSourceMode(e.target.value)}
                  >
                    <option value="lowest_score">Ưu tiên từ điểm thấp nhất (Mặc định)</option>
                    <option value="overdue">Từ đến hạn ôn tập (Quên lãng)</option>
                    <option value="newest">Từ mới thêm gần đây</option>
                    <option value="oldest">Từ cũ nhất</option>
                    <option value="random">Ngẫu nhiên</option>
                  </select>
                </div>

                <div className="setup-section">
                  <label className="setup-label">Độ thành thạo</label>
                  <select 
                    className="setup-select"
                    value={filterTier}
                    onChange={e => setFilterTier(e.target.value)}
                  >
                    <option value="all">Tất cả các mức</option>
                    <option value="not_started">Chưa học</option>
                    <option value="learning">Đang học</option>
                    <option value="familiar">Đã quen</option>
                    <option value="mastered">Thành thạo</option>
                  </select>
                </div>

                <div className="setup-section">
                  <label className="setup-label">Bộ từ vựng (Deck)</label>
                  <select 
                    className="setup-select"
                    value={filterDeck}
                    onChange={e => setFilterDeck(e.target.value)}
                  >
                    <option value="">Tất cả các bộ (All Decks)</option>
                    {decks.map((d: any) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="setup-section">
                  <label className="setup-label">Số lượng từ vựng</label>
                  <div className="setup-options">
                    <button 
                      className={`setup-option-btn ${wordCount === 8 && !customWordCount ? 'active' : ''}`}
                      onClick={() => { setWordCount(8); setCustomWordCount('') }}
                    >
                      8 từ
                    </button>
                    <button 
                      className={`setup-option-btn ${wordCount === 12 && !customWordCount ? 'active' : ''}`}
                      onClick={() => { setWordCount(12); setCustomWordCount('') }}
                    >
                      12 từ
                    </button>
                  </div>
                  <div className="setup-custom-input">
                    <span>Khác:</span>
                    <input 
                      type="number" 
                      min="1" max="100" 
                      placeholder="Nhập số..." 
                      value={customWordCount}
                      onChange={e => setCustomWordCount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* CỘT 2: Các bước luyện tập */}
              <div className="setup-col">
                <div className="setup-section" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                  <label className="setup-label">Các bước luyện tập</label>
                  <div className="setup-checkbox-list steps-list">
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[1]} onChange={() => toggleStep(1 as any)} />
                      <span><strong>Step 1:</strong> Xem Flashcard</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[2]} onChange={() => toggleStep(2 as any)} />
                      <span><strong>Step 2:</strong> Danh sách tổng quan</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[3]} onChange={() => toggleStep(3 as any)} />
                      <span><strong>Step 3:</strong> Trắc nghiệm nghĩa</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[4]} onChange={() => toggleStep(4 as any)} />
                      <span><strong>Step 4:</strong> Trắc nghiệm âm thanh</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[5]} onChange={() => toggleStep(5 as any)} />
                      <span><strong>Step 5:</strong> Gõ từ tiếng Anh</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={selectedSteps[6]} onChange={() => toggleStep(6 as any)} />
                      <span><strong>Step 6:</strong> Luyện phát âm (Micro)</span>
                    </label>
                  </div>
                </div>

                <div className="setup-section" style={{ marginTop: 20 }}>
                  <label className="setup-label">Cài đặt chung</label>
                  <div className="setup-checkbox-list">
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={enablePoints} onChange={e => setEnablePoints(e.target.checked)} />
                      <span>Tính điểm thông thạo (Ghi nhận kết quả)</span>
                    </label>
                    <label className="setup-checkbox">
                      <input type="checkbox" checked={enableRepeat} onChange={e => setEnableRepeat(e.target.checked)} />
                      <span>Lặp lại đến khi đúng hết (Step 3-6)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="setup-footer wide-footer">
              <button className="btn-primary setup-start-btn" onClick={startPractice} disabled={loading || activeStepKeys.length === 0}>
                {loading ? 'Đang tải...' : 'Bắt đầu luyện tập'} <PlayIcon className="icon icon-inline" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate Progress
  const currentIndex = activeStepKeys.indexOf(step)
  const progressPercent = currentIndex >= 0 ? ((currentIndex) / activeStepKeys.length) * 100 : 100

  // ===== RENDER STEPS =====
  return (
    <div className="practice-container">
      <div className="practice-step-content">
        {step === 1 && words.length > 0 && (
          <div className={`flashcard-step-container ${isCardExpanded ? 'expanded-container' : ''}`}>
            <div className="flashcard-header-row">
              <div className="flashcard-counter">
                Từ {currentWordIndex + 1} / {words.length}
              </div>
              <div className="flashcard-autoplay-toggle">
                <span className="autoplay-label">Tự động đọc</span>
                <label className="custom-switch">
                  <input type="checkbox" checked={autoPlaySound} onChange={e => setAutoPlaySound(e.target.checked)} />
                  <span className="custom-slider"></span>
                </label>
                <SpeakerWaveIcon className="icon autoplay-icon" />
              </div>
            </div>
            
            <AnimatePresence mode="wait">
            <motion.div 
              key={currentWordIndex}
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`flashcard-main ${isCardExpanded ? 'expanded' : ''}`}
            >
              <div className="flashcard-left-col">
                <div className="flashcard-image-box">
                  {words[currentWordIndex].imageUrl ? (
                    <img src={words[currentWordIndex].imageUrl} alt={words[currentWordIndex].word} />
                  ) : (
                    <div className="flashcard-no-image">
                      <PhotoIcon className="icon" />
                      <span>Không có ảnh minh họa</span>
                    </div>
                  )}
                </div>

                {isCardExpanded && (
                  <div className="flashcard-extra-left">
                    {(words[currentWordIndex].synonyms?.length > 0 || words[currentWordIndex].antonyms?.length > 0) && (
                      <div className="fc-section fc-tags-section">
                        {words[currentWordIndex].synonyms?.length > 0 && (
                          <div>
                            <span className="fc-label">Đồng nghĩa:</span>
                            <div className="fc-tags">
                              {words[currentWordIndex].synonyms.map((s: string, i: number) => (
                                <span key={i} className="fc-tag syn">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {words[currentWordIndex].antonyms?.length > 0 && (
                          <div>
                            <span className="fc-label">Trái nghĩa:</span>
                            <div className="fc-tags">
                              {words[currentWordIndex].antonyms.map((a: string, i: number) => (
                                <span key={i} className="fc-tag ant">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {words[currentWordIndex].note && (
                      <div className="fc-section">
                        <h4>Ghi chú</h4>
                        <p className="fc-note">{words[currentWordIndex].note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flashcard-content-wrap">
                <div className="flashcard-word-row">
                  <h2 className="flashcard-word">{words[currentWordIndex].word}</h2>
                  <button className="flashcard-speak-btn" onClick={() => speakWord(words[currentWordIndex].word)}>
                    <SpeakerWaveIcon className="icon" />
                  </button>
                </div>
                
                <div className="flashcard-meaning">
                  {words[currentWordIndex].meanings.join(', ')}
                </div>

                <button className="flashcard-expand-toggle" onClick={() => setIsCardExpanded(!isCardExpanded)}>
                  {isCardExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                  {isCardExpanded ? <ChevronUpIcon className="icon icon-inline" /> : <ChevronDownIcon className="icon icon-inline" />}
                </button>

                {isCardExpanded && (
                  <div className="flashcard-details">
                    <div className="fc-detail-grid">
                      <div className="fc-detail-item">
                        <span className="fc-label">Phiên âm:</span>
                        <span className="fc-value">{words[currentWordIndex].pronunciation || '—'}</span>
                      </div>
                      <div className="fc-detail-item">
                        <span className="fc-label">Từ loại:</span>
                        <span className="fc-value">{words[currentWordIndex].partOfSpeech || '—'}</span>
                      </div>
                    </div>

                    {words[currentWordIndex].examples?.length > 0 && (
                      <div className="fc-section">
                        <h4><LightBulbIcon className="icon icon-inline" /> Ví dụ</h4>
                        {words[currentWordIndex].examples.map((ex: any, i: number) => (
                          <div key={i} className="fc-example">
                            <p className="fc-en">{ex.en}</p>
                            <p className="fc-vi">{ex.vi}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </motion.div>
            </AnimatePresence>

            <div className="flashcard-navigation">
              <button 
                className="btn-outline btn-nav" 
                disabled={currentWordIndex === 0}
                onClick={() => { setCurrentWordIndex(prev => prev - 1); setIsCardExpanded(false) }}
              >
                <ChevronLeftIcon className="icon icon-inline" /> Trước
              </button>
              
              {currentWordIndex < words.length - 1 ? (
                <button 
                  className="btn-primary btn-nav" 
                  onClick={() => { setCurrentWordIndex(prev => prev + 1); setIsCardExpanded(false) }}
                >
                  Tiếp theo <ChevronRightIcon className="icon icon-inline" />
                </button>
              ) : (
                <button 
                  className="btn-primary btn-nav" 
                  onClick={goNextStep}
                >
                  Hoàn thành bước này <PlayIcon className="icon icon-inline" />
                </button>
              )}
            </div>
          </div>
        )}

        {step === 2 && words.length > 0 && (
          <div className="overview-step-container">
            <h2 className="step-title">Danh sách tổng quan</h2>
            <p className="step-subtitle">Hãy xem lướt qua các từ vựng này một lần trước khi bắt đầu kiểm tra nhé!</p>
            
            <div className="overview-list">
              {words.map((w, idx) => (
                <div key={idx} className="overview-item">
                  <div className="overview-word-col">
                    <span className="overview-word">{w.word}</span>
                    <button className="overview-speak-btn" onClick={() => speakWord(w.word)} title="Nghe phát âm">
                      <SpeakerWaveIcon className="icon" />
                    </button>
                  </div>
                  <div className="overview-pronunciation-col">
                    {w.pronunciation ? `/${w.pronunciation}/` : ''}
                  </div>
                  <div className="overview-meaning-col">
                    {w.meanings[0]}
                    {w.meanings.length > 1 && <span className="overview-more-meanings"> (+{w.meanings.length - 1})</span>}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-primary overview-next-btn" onClick={goNextStep}>
              Sẵn sàng, bắt đầu quiz! <PlayIcon className="icon icon-inline" />
            </button>
          </div>
        )}

                {step === 3 && (
          <div className="quiz-step-container">
            {!quizCompleted && currentQuizWord ? (
              <motion.div 
                className="quiz-card"
                animate={
                  selectedAnswer && selectedAnswer === currentQuizWord?.word ? { scale: [1, 1.02, 1] } 
                  : selectedAnswer && selectedAnswer !== currentQuizWord?.word ? { x: [-10, 10, -10, 10, 0] } 
                  : {}
                }
                transition={{ duration: 0.4 }}
              >
                <div className="quiz-header">
                  <span className="quiz-counter">Còn lại: {quizQueue.length} từ</span>
                  <h2 className="quiz-question">Chọn từ tiếng Anh có nghĩa là:</h2>
                  <div className="quiz-meaning-highlight">
                    "{currentQuizWord.meanings.join(', ')}"
                  </div>
                </div>
                
                <div className="quiz-options-grid">
                  {quizOptions.map((opt, idx) => {
                    let btnClass = "quiz-option-btn"
                    if (selectedAnswer) {
                      if (opt === currentQuizWord.word) btnClass += " correct"
                      else if (opt === selectedAnswer) btnClass += " incorrect"
                      else btnClass += " disabled"
                    }
                    
                    return (
                      <button 
                        key={idx} 
                        className={btnClass}
                        onClick={() => handleQuizAnswer(opt)}
                        disabled={!!selectedAnswer}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="step-complete-card">
                <h2>Tuyệt vời! 🎉</h2>
                <p>Bạn đã hoàn thành bài Trắc nghiệm chữ.</p>
                <button className="btn-primary" onClick={goNextStep} style={{ marginTop: 24 }}>
                  Chuyển sang bước tiếp theo <PlayIcon className="icon icon-inline" />
                </button>
              </div>
            )}
          </div>
        )}

                {step === 4 && (
          <div className="quiz-step-container">
            {!audioQuizCompleted && currentAudioQuizWord ? (
              <motion.div 
                className="quiz-card"
                animate={
                  audioSelectedAnswer && audioSelectedAnswer === currentAudioQuizWord?.word ? { scale: [1, 1.02, 1] } 
                  : audioSelectedAnswer && audioSelectedAnswer !== currentAudioQuizWord?.word ? { x: [-10, 10, -10, 10, 0] } 
                  : {}
                }
                transition={{ duration: 0.4 }}
              >
                <div className="quiz-header">
                  <span className="quiz-counter">Còn lại: {audioQuizQueue.length} từ</span>
                  <h2 className="quiz-question">Nghe và chọn từ chính xác:</h2>
                  <div className="audio-quiz-play-btn-wrap">
                    <button 
                      className="audio-quiz-play-btn" 
                      onClick={() => speakWord(currentAudioQuizWord.word)}
                    >
                      <SpeakerWaveIcon className="icon" style={{ width: 48, height: 48 }} />
                    </button>
                    <p>Nhấn để nghe lại</p>
                  </div>
                </div>
                
                <div className="quiz-options-grid">
                  {audioQuizOptions.map((opt, idx) => {
                    let btnClass = "quiz-option-btn"
                    if (audioSelectedAnswer) {
                      if (opt === currentAudioQuizWord.word) btnClass += " correct"
                      else if (opt === audioSelectedAnswer) btnClass += " incorrect"
                      else btnClass += " disabled"
                    }
                    
                    return (
                      <button 
                        key={idx} 
                        className={btnClass}
                        onClick={() => handleAudioQuizAnswer(opt)}
                        disabled={!!audioSelectedAnswer}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="step-complete-card">
                <h2>Tuyệt vời! 🎉</h2>
                <p>Bạn đã hoàn thành bài Trắc nghiệm âm thanh.</p>
                <button className="btn-primary" onClick={goNextStep} style={{ marginTop: 24 }}>
                  Chuyển sang bước tiếp theo <PlayIcon className="icon icon-inline" />
                </button>
              </div>
            )}
          </div>
        )}

                {step === 5 && (
          <div className="quiz-step-container">
            {!typingCompleted && currentTypingWord ? (
              <motion.div 
                className="quiz-card"
                animate={
                  typingStatus === 'correct' ? { scale: [1, 1.02, 1] } 
                  : typingStatus === 'incorrect' ? { x: [-10, 10, -10, 10, 0] } 
                  : {}
                }
                transition={{ duration: 0.4 }}
              >
                <div className="quiz-header">
                  <span className="quiz-counter">Còn lại: {typingQueue.length} từ</span>
                  <h2 className="quiz-question">Gõ từ tiếng Anh có nghĩa là:</h2>
                  <div className="quiz-meaning-highlight">
                    "{currentTypingWord.meanings.join(', ')}"
                  </div>
                  <button className="btn-outline btn-sm mt-3" onClick={() => speakWord(currentTypingWord.word)}>
                    <SpeakerWaveIcon className="icon icon-inline" /> Nghe gợi ý
                  </button>
                </div>
                
                <form className="typing-form" onSubmit={handleTypingSubmit}>
                  <input
                    type="text"
                    className={`typing-input ${typingStatus}`}
                    value={typingInput}
                    onChange={(e) => setTypingInput(e.target.value)}
                    disabled={typingStatus !== 'idle'}
                    placeholder="Nhập từ tiếng Anh..."
                    autoFocus
                    autoComplete="off"
                  />
                  
                  {typingStatus === 'incorrect' && (
                     <div className="typing-feedback incorrect">
                        Sai rồi! Đáp án đúng là: <strong>{currentTypingWord.word}</strong>
                     </div>
                  )}
                  {typingStatus === 'correct' && (
                     <div className="typing-feedback correct">
                        Chính xác! 🎉
                     </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-primary w-100 mt-4" 
                    disabled={typingStatus !== 'idle' || !typingInput.trim()}
                  >
                    Kiểm tra
                  </button>
                </form>
              </motion.div>
            ) : (
              <div className="step-complete-card">
                <h2>Tuyệt vời! 🎉</h2>
                <p>Bạn đã hoàn thành bài Nhập từ tiếng Anh.</p>
                <button className="btn-primary" onClick={goNextStep} style={{ marginTop: 24 }}>
                  Chuyển sang bước tiếp theo <PlayIcon className="icon icon-inline" />
                </button>
              </div>
            )}
          </div>
        )}

                {step === 6 && (
          <div className="quiz-step-container">
            {!speakingCompleted && currentSpeakingWord ? (
              <motion.div 
                className="quiz-card"
                animate={
                  speakingStatus === 'correct' ? { scale: [1, 1.02, 1] } 
                  : speakingStatus === 'incorrect' ? { x: [-10, 10, -10, 10, 0] } 
                  : {}
                }
                transition={{ duration: 0.4 }}
              >
                <div className="quiz-header">
                  <span className="quiz-counter">Còn lại: {speakingQueue.length} từ</span>
                  <h2 className="quiz-question">Đọc to từ tiếng Anh sau:</h2>
                  <div className="quiz-meaning-highlight" style={{ fontSize: '48px', color: 'var(--text-primary)' }}>
                    {currentSpeakingWord.word}
                  </div>
                  <p className="step-subtitle mt-3">Nghĩa: {currentSpeakingWord.meanings.join(', ')}</p>
                </div>
                
                <div className="speaking-interaction">
                  <button 
                    className={`mic-btn ${speakingStatus}`}
                    onClick={startListening}
                    disabled={speakingStatus !== 'idle' && speakingStatus !== 'incorrect'}
                  >
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  
                  {speakingStatus === 'idle' && <p className="mic-hint">Bấm vào Micro và bắt đầu nói</p>}
                  {speakingStatus === 'listening' && <p className="mic-hint listening">Đang nghe...</p>}
                  
                  <AudioVisualizer isListening={speakingStatus === 'listening'} />

                  {transcriptResult && (
                    <div className={`speaking-result-box ${speakingStatus}`}>
                      <p className="you-said-label">Hệ thống nghe được:</p>
                      <p className="you-said-text">"{transcriptResult}"</p>
                      {speakingStatus === 'correct' && <p className="feedback-text correct">Tuyệt vời! Chính xác! 🎉</p>}
                      {speakingStatus === 'incorrect' && <p className="feedback-text incorrect">Chưa chính xác, từ này sẽ được luyện lại!</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="step-complete-card">
                <h2>Tuyệt vời! 🎉</h2>
                <p>Bạn đã hoàn thành phiên luyện Phát âm.</p>
                <button className="btn-primary" onClick={goNextStep} style={{ marginTop: 24 }}>
                  Xem Tổng Kết <PlayIcon className="icon icon-inline" />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="step-placeholder-card">
            <h2>🎉 Chúc mừng!</h2>
            <p>Bạn đã hoàn thành phiên luyện tập thông thạo.</p>
            <button className="btn-primary" onClick={() => setStep(0)} style={{ marginTop: 24 }}>
              Luyện tập tiếp
            </button>
            <button className="btn-outline" onClick={onExit} style={{ marginTop: 12, width: '100%' }}>
              Trở về trang chủ
            </button>
          </div>
        )}
      </div>

      <div className="practice-bottombar">
        <button className="practice-exit-btn" onClick={onExit}>
          <ChevronLeftIcon className="icon" style={{ width: 20, height: 20 }} /> Thoát
        </button>
        
            {step >= 1 && step <= 6 && (
        <div className="practice-stepper">
          {activeStepKeys.map((stepKey, index) => {
            const isActive = step === stepKey;
            const isPassed = activeStepKeys.indexOf(step) > index;
            
            let stageName = '';
            let stageDesc = '';
            if (stepKey === 1) { stageName = "Giai đoạn 1"; stageDesc = "Flashcard"; }
            if (stepKey === 2) { stageName = "Giai đoạn 2"; stageDesc = "Nhìn Hình"; }
            if (stepKey === 3) { stageName = "Giai đoạn 3"; stageDesc = "Đọc Chữ"; }
            if (stepKey === 4) { stageName = "Giai đoạn 4"; stageDesc = "Luyện Nghe"; }
            if (stepKey === 5) { stageName = "Giai đoạn 5"; stageDesc = "Luyện Viết"; }
            if (stepKey === 6) { stageName = "Giai đoạn 6"; stageDesc = "Luyện Nói"; }

            return (
              <div key={stepKey} className={`stepper-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}>
                <div className="stepper-circle">{index + 1}</div>
                <div className="stepper-text">
                  <div className="stepper-stage">{stageName}</div>
                  <div className="stepper-desc">{stageDesc}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
        
        <div className="practice-step-nav-group">
          <button 
            className="practice-step-nav-btn" 
            onClick={goPrevStep} 
            disabled={currentIndex <= 0}
            title="Quay lại bước trước"
          >
            <ChevronLeftIcon className="icon" />
          </button>
          <button 
            className="practice-step-nav-btn" 
            onClick={goNextStep} 
            disabled={step === 7}
            title="Chuyển sang bước tiếp theo"
          >
            <ChevronRightIcon className="icon" />
          </button>
        </div>
      </div>
    </div>
  )
}
