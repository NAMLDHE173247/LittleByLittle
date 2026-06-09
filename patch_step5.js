const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

// 1. Insert State Variables
const stateCode = `
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
       fetch(\`\${PROGRESS_API_URL}/review\`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ word: currentTypingWord.word, skill: 'writing', isCorrect })
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
`;

if (!code.includes('// Step 5: Typing Quiz state')) {
  code = code.replace('// Calculate total active steps', stateCode + '\n  // Calculate total active steps');
}

// 2. Insert JSX
const step5Jsx = `        {step === 5 && (
          <div className="quiz-step-container">
            {!typingCompleted && currentTypingWord ? (
              <div className="quiz-card">
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
                    className={\`typing-input \${typingStatus}\`}
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
              </div>
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

        {step === 6 && (`;

code = code.replace('{step >= 5 && step <= 6 && (', step5Jsx);

fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const newCss = `
/* TYPING STEP (STEP 5) */
.typing-form {
  max-width: 500px;
  margin: 0 auto;
}

.typing-input {
  width: 100%;
  padding: 16px 24px;
  font-size: 24px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background-color: var(--bg-body);
  color: var(--text-primary);
  text-align: center;
  transition: all 0.2s;
}

.typing-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.typing-input.correct {
  border-color: #22c55e;
  background-color: rgba(34, 197, 94, 0.05);
  color: #16a34a;
}

.typing-input.incorrect {
  border-color: #f43f5e;
  background-color: rgba(244, 63, 94, 0.05);
  color: #e11d48;
}

.typing-feedback {
  margin-top: 16px;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 16px;
}

.typing-feedback.correct {
  background-color: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.typing-feedback.incorrect {
  background-color: rgba(244, 63, 94, 0.1);
  color: #e11d48;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 24px; }
.w-100 { width: 100%; }
`;

if (!css.includes('.typing-form')) {
  fs.writeFileSync('client/src/PracticeFlow.css', css + newCss, 'utf8');
}

console.log("Done");
