const fs = require('fs');
let file = 'train-english-next/src/components/features/Statistics/StatisticsPage.tsx';
let content = fs.readFileSync(file, 'utf-8');
content = content.replace(/\.map\(\(act, idx\)/g, '.map((act: any, idx: any)');
fs.writeFileSync(file, content, 'utf-8');
