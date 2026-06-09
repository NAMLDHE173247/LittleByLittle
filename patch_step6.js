const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

// 1. Insert State Variables
const stateCode = `
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

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
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
    const isCorrect = transcript.toLowerCase().replace(/[.,!?]/g, '').trim() === currentSpeakingWord.word.toLowerCase()
    
    setSpeakingStatus(isCorrect ? 'correct' : 'incorrect')
    
    if (enablePoints) {
       fetch(\`\${PROGRESS_API_URL}/review\`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ word: currentSpeakingWord.word, skill: 'pronunciation', isCorrect })
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
`;

if (!code.includes('// Step 6: Speaking Quiz state')) {
  code = code.replace('// Calculate total active steps', stateCode + '\n  // Calculate total active steps');
}

// 2. Insert JSX
const step6Jsx = `        {step === 6 && (
          <div className="quiz-step-container">
            {!speakingCompleted && currentSpeakingWord ? (
              <div className="quiz-card">
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
                    className={\`mic-btn \${speakingStatus}\`}
                    onClick={startListening}
                    disabled={speakingStatus !== 'idle' && speakingStatus !== 'incorrect'}
                  >
                    <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                  
                  {speakingStatus === 'idle' && <p className="mic-hint">Bấm vào Micro và bắt đầu nói</p>}
                  {speakingStatus === 'listening' && <p className="mic-hint listening">Đang nghe...</p>}
                  
                  {transcriptResult && (
                    <div className={\`speaking-result-box \${speakingStatus}\`}>
                      <p className="you-said-label">Hệ thống nghe được:</p>
                      <p className="you-said-text">"{transcriptResult}"</p>
                      {speakingStatus === 'correct' && <p className="feedback-text correct">Tuyệt vời! Chính xác! 🎉</p>}
                      {speakingStatus === 'incorrect' && <p className="feedback-text incorrect">Chưa chính xác, từ này sẽ được luyện lại!</p>}
                    </div>
                  )}
                </div>
              </div>
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
        )}`;

if (code.includes('{step === 6 && (')) {
  // It's currently `{step === 6 && (\n          <div className="step-placeholder-card">`
  code = code.replace(/\{step === 6 && \([\s\S]*?<\/div>\n        \)\}/, step6Jsx);
} else if (code.includes('{step >= 6 && step <= 6 && (')) { // just in case
  code = code.replace(/\{step >= 6 && step <= 6 && \([\s\S]*?<\/div>\n        \)\}/, step6Jsx);
}

fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const newCss = `
/* SPEAKING STEP (STEP 6) */
.speaking-interaction {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 32px;
}

.mic-btn {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: none;
  background-color: var(--bg-body);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.mic-btn .icon {
  width: 40px;
  height: 40px;
}

.mic-btn:hover:not(:disabled) {
  background-color: var(--accent-light);
  color: var(--accent);
  transform: scale(1.05);
}

.mic-btn.listening {
  background-color: var(--accent);
  color: white;
  animation: pulse-mic 1.5s infinite;
}

.mic-btn.correct {
  background-color: #22c55e;
  color: white;
}

.mic-btn.incorrect {
  background-color: #f43f5e;
  color: white;
}

.mic-hint {
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 16px;
}

.mic-hint.listening {
  color: var(--accent);
  font-weight: 600;
}

.speaking-result-box {
  margin-top: 24px;
  padding: 20px;
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-body);
  border: 2px solid var(--border);
  text-align: center;
}

.speaking-result-box.correct {
  border-color: #22c55e;
  background-color: rgba(34, 197, 94, 0.05);
}

.speaking-result-box.incorrect {
  border-color: #f43f5e;
  background-color: rgba(244, 63, 94, 0.05);
}

.you-said-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.you-said-text {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.feedback-text {
  font-weight: 600;
}

@keyframes pulse-mic {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
  70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
`;

if (!css.includes('.speaking-interaction')) {
  fs.writeFileSync('client/src/PracticeFlow.css', css + newCss, 'utf8');
}

console.log("Done");
