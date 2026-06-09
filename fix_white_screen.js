const fs = require('fs');

let code = fs.readFileSync('client/src/PracticeFlow.tsx', 'utf8');

// The block to extract
const speakWordRegex = /  const speakWord = useCallback\(\(text: string\) => \{[\s\S]*?\}, \[\]\)\n/;
const match = code.match(speakWordRegex);

if (match) {
  const speakWordCode = match[0];
  // Remove from old location
  code = code.replace(speakWordCode, '');
  
  // Insert before Step 3 state
  code = code.replace('  // Step 3: Quiz Text state', speakWordCode + '\n  // Step 3: Quiz Text state');
  
  fs.writeFileSync('client/src/PracticeFlow.tsx', code, 'utf8');
  console.log('Fixed ReferenceError');
} else {
  console.log('Could not find speakWord block');
}
