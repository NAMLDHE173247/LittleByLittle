const fs = require('fs');
let file = 'train-english-next/src/lib/services/progress.service.ts';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/const userId = userId;/g, '// const userId = userId;');
fs.writeFileSync(file, content, 'utf-8');
