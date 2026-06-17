const fs = require('fs');
let prog = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');

// The blocks were defined like:
// export const handle_GET_something = async (...) => { ...
// }); <- at column 0
prog = prog.replace(/^(\s*)\}\);$/gm, '$1};');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
