const fs = require('fs');
let prog = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');

// Replace all remaining `});` with `};` at the end of catch blocks
prog = prog.replace(/\}\r?\n\}\);/g, '}\n};');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
