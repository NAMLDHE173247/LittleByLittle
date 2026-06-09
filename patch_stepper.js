const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

const stepperJsx = `      {step >= 1 && step <= 6 && (
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
              <div key={stepKey} className={\`stepper-item \${isActive ? 'active' : ''} \${isPassed ? 'passed' : ''}\`}>
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
      <div className="practice-step-content">`;

if (!code.includes('<div className="practice-stepper">')) {
  code = code.replace('<div className="practice-step-content">', stepperJsx);
  fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');
}

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const stepperCss = `
/* STEPPER PROGRESS BAR */
.practice-stepper {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto 32px auto;
  background-color: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow-x: auto;
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 8px;
  opacity: 0.5;
  transition: all 0.3s;
  min-width: fit-content;
}

.stepper-item.passed {
  opacity: 0.8;
}

.stepper-item.active {
  opacity: 1;
  background-color: #f0f4ff;
}

.stepper-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #64748b;
  transition: all 0.3s;
}

.stepper-item.active .stepper-circle {
  background-color: #1e3a8a;
  border-color: #1e3a8a;
  color: white;
}

.stepper-text {
  display: flex;
  flex-direction: column;
}

.stepper-stage {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 600;
}

.stepper-item.active .stepper-stage {
  color: #3b82f6;
}

.stepper-desc {
  font-size: 14px;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
}

.stepper-item.active .stepper-desc {
  color: #1e3a8a;
}
`;

if (!css.includes('.practice-stepper')) {
  fs.writeFileSync('client/src/PracticeFlow.css', css + stepperCss, 'utf8');
}

console.log("Done stepper");
