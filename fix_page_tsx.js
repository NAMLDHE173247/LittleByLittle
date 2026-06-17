const fs = require('fs');
let file = 'train-english-next/src/app/page.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/setEditingDeck\(/g, '// setEditingDeck(');
fs.writeFileSync(file, content, 'utf-8');
