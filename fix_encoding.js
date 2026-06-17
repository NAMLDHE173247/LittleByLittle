const fs = require('fs');
let content = fs.readFileSync('train-english-next/src/types/progress.ts', 'utf-8');
// remove the badly encoded line from powershell
content = content.replace(/export interface ProgressData.*/g, '');
content = content.replace(/\0/g, ''); // Remove null bytes from utf16
content += '\nexport interface ProgressData { [key: string]: any; }\n';
fs.writeFileSync('train-english-next/src/types/progress.ts', content, 'utf-8');
