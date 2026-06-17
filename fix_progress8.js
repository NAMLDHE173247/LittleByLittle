const fs = require('fs');

let prog = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');
// Every block end '});' that is at the beginning of the line should be '};'
prog = prog.replace(/^(\s*)\}\);(\s*)$/gm, '$1};$2');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
