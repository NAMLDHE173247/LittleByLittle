const fs = require('fs');
fs.rmSync('train-english-next/src/app/api/progress/[...path]', { recursive: true, force: true });
