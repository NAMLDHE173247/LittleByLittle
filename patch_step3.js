const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

// 1. Insert State Variables
const stateCode = `
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
       fetch(\`\${PROGRESS_API_URL}/review\`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ word: currentQuizWord.word, skill: 'reading', isCorrect })
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
`;

if (!code.includes('// Step 3: Quiz Text state')) {
  code = code.replace('// Calculate total active steps', stateCode + '\n  // Calculate total active steps');
}

// 2. Insert JSX
const step3Jsx = `        {step === 3 && (
          <div className="quiz-step-container">
            {!quizCompleted && currentQuizWord ? (
              <div className="quiz-card">
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
              </div>
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

        {step >= 4 && step <= 6 && (`;

code = code.replace('{step >= 3 && step <= 6 && (', step3Jsx);

fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const newCss = `
/* QUIZ STEP (STEP 3 & 4) */
.quiz-step-container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.quiz-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 40px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  text-align: center;
}

.quiz-header {
  margin-bottom: 40px;
}

.quiz-counter {
  display: inline-block;
  background-color: var(--bg-body);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.quiz-question {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-weight: 500;
}

.quiz-meaning-highlight {
  font-size: 36px;
  font-weight: 800;
  color: var(--accent);
  line-height: 1.3;
}

.quiz-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.quiz-option-btn {
  background-color: var(--bg-body);
  border: 2px solid var(--border);
  border-radius: 16px;
  padding: 24px 20px;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.quiz-option-btn:hover:not(:disabled) {
  border-color: var(--accent);
  background-color: var(--accent-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0,0,0,0.05);
}

.quiz-option-btn.correct {
  background-color: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
  color: #16a34a;
}

.quiz-option-btn.incorrect {
  background-color: rgba(244, 63, 94, 0.1);
  border-color: #f43f5e;
  color: #e11d48;
}

.quiz-option-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-complete-card {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 60px 40px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.step-complete-card h2 {
  font-size: 32px;
  margin-bottom: 16px;
}

.step-complete-card p {
  font-size: 16px;
  color: var(--text-secondary);
}
`;

if (!css.includes('/* QUIZ STEP (STEP 3 & 4) */')) {
  fs.writeFileSync('client/src/PracticeFlow.css', css + newCss, 'utf8');
}

console.log("Done");
