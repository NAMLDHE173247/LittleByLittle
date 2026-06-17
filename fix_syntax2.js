const fs = require('fs');

// Fix progress.service.ts
let prog = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');
const importLines = [];
const otherLines = [];

for (const line of prog.split('\n')) {
  if (line.trim().startsWith('import ') && !line.includes('export class')) {
    importLines.push(line);
  } else {
    otherLines.push(line);
  }
}

// Remove export default AppWrapper from page.tsx at the bottom if it appears multiple times
let page = fs.readFileSync('train-english-next/src/app/page.tsx', 'utf-8');
let pageLines = page.split('\n');
let exportDefaultCount = 0;
pageLines = pageLines.filter(line => {
  if (line.includes('export default')) {
    exportDefaultCount++;
    if (exportDefaultCount > 1) return false;
  }
  return true;
});

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', importLines.join('\n') + '\n' + otherLines.join('\n'), 'utf-8');
fs.writeFileSync('train-english-next/src/app/page.tsx', pageLines.join('\n'), 'utf-8');
