const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

const startStr = `            {step >= 1 && step <= 6 && (`;
const endStr = `      )}
      <div className="practice-step-content">`;

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr) + `      )}`.length;

if (startIndex !== -1 && endIndex !== -1) {
  const fullStepper = code.substring(startIndex, endIndex);

  // Remove from top (including the trailing newline)
  code = code.replace(fullStepper + '\n', '');

  // Find practice-progress-wrap to replace
  const progressWrapRegex = / *<div className="practice-progress-wrap">[\s\S]*?<\/div> *\n *<span className="practice-step-label">[\s\S]*?<\/span> *\n *<\/div>/;
  // Wait, let's just replace the exact string of the old progress bar
  const oldProgressWrap = `        <div className="practice-progress-wrap">
          <div className="practice-progress-bar">
            <div className="practice-progress-fill" style={{ width: \`\${progressPercent}%\` }}></div>
          </div>
          <span className="practice-step-label">
            {step === 7 ? 'Hoàn thành' : \`Bước \${currentIndex + 1} / \${activeStepKeys.length}\`}
          </span>
        </div>`;
  
  if (code.includes(oldProgressWrap)) {
    code = code.replace(oldProgressWrap, fullStepper);
  }

  fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');
}

// Update CSS
let css = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

// The stepper is now in the bottom bar, so we should remove its margins, box-shadow, background-color, and make it flexible.
const newStepperCss = `
/* STEPPER PROGRESS BAR (BOTTOM BAR) */
.practice-stepper {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  flex: 1;
  overflow-x: auto;
  padding: 0 16px;
}

.stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 8px;
  opacity: 0.4;
  transition: all 0.3s;
  min-width: fit-content;
}

.stepper-item.passed {
  opacity: 0.7;
}

.stepper-item.active {
  opacity: 1;
  background-color: #f0f4ff;
}

.stepper-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
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
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 600;
}

.stepper-item.active .stepper-stage {
  color: #3b82f6;
}

.stepper-desc {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
}

.stepper-item.active .stepper-desc {
  color: #1e3a8a;
}
`;

// Replace the old stepper CSS
const oldStepperCssRegex = /\/\* STEPPER PROGRESS BAR \*\/[\s\S]*?(?=\/\*|$)/;
if (css.match(oldStepperCssRegex)) {
  css = css.replace(oldStepperCssRegex, newStepperCss);
  fs.writeFileSync('client/src/PracticeFlow.css', css, 'utf8');
}

console.log("Moved stepper to bottom");
