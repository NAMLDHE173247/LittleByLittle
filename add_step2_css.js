const fs = require('fs');
const text = fs.readFileSync('client/src/PracticeFlow.css', 'utf8');

const newCss = `
/* OVERVIEW STEP (STEP 2) */
.overview-step-container {
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--bg-card);
  padding: 32px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border);
}

.overview-step-container .step-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.overview-step-container .step-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.overview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.overview-list::-webkit-scrollbar {
  width: 6px;
}
.overview-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.overview-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--bg-body);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  gap: 16px;
  transition: all 0.2s;
}

.overview-item:hover {
  border-color: var(--accent-hover);
  background-color: var(--accent-light);
}

.overview-word-col {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 180px;
  flex-shrink: 0;
}

.overview-word {
  font-weight: 700;
  font-size: 16px;
  color: var(--accent);
}

.overview-speak-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.overview-speak-btn:hover {
  color: var(--accent);
  background-color: rgba(99, 102, 241, 0.1);
}

.overview-speak-btn .icon {
  width: 18px;
  height: 18px;
}

.overview-pronunciation-col {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 14px;
  width: 140px;
  flex-shrink: 0;
}

.overview-meaning-col {
  color: var(--text-primary);
  font-size: 15px;
  flex: 1;
  font-weight: 500;
}

.overview-more-meanings {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
}

.overview-next-btn {
  margin-top: 16px;
  width: 100%;
  padding: 14px;
  font-size: 16px;
}
`;

if (!text.includes('/* OVERVIEW STEP (STEP 2) */')) {
  fs.writeFileSync('client/src/PracticeFlow.css', text + newCss, 'utf8');
  console.log('Added Step 2 CSS');
} else {
  console.log('Step 2 CSS already exists');
}
