const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

// 1. Insert State Variables
const stateCode = `
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
       fetch(\`\${PROGRESS_API_URL}/review\`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ word: currentAudioQuizWord.word, skill: 'reading', isCorrect })
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
`;

if (!code.includes('// Step 4: Audio Quiz state')) {
  code = code.replace('// Calculate total active steps', stateCode + '\n  // Calculate total active steps');
}

// 2. Insert JSX
const step4Jsx = `        {step === 4 && (
          <div className="quiz-step-container">
            {!audioQuizCompleted && currentAudioQuizWord ? (
              <div className="quiz-card">
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
              </div>
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

        {step >= 5 && step <= 6 && (`;

code = code.replace('{step >= 4 && step <= 6 && (', step4Jsx);

fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const newCss = `
.audio-quiz-play-btn-wrap {
  margin: 32px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.audio-quiz-play-btn {
  background-color: var(--accent);
  color: white;
  border: none;
  border-radius: 50%;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
  animation: pulse-ring 2s infinite;
}

.audio-quiz-play-btn:hover {
  transform: scale(1.05);
  background-color: var(--accent-hover);
}

.audio-quiz-play-btn-wrap p {
  color: var(--text-muted);
  font-size: 14px;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
`;

if (!css.includes('.audio-quiz-play-btn-wrap')) {
  fs.writeFileSync('client/src/PracticeFlow.css', css + newCss, 'utf8');
}

console.log("Done");
