const fs = require('fs');
const progressPath = 'train-english-next/src/types/progress.ts';
let progressContent = fs.readFileSync(progressPath, 'utf8');
progressContent = progressContent.replace(/export interface ProgressData \{\s*\[key: string\]: any;\s*\}/, '');
fs.writeFileSync(progressPath, progressContent, 'utf8');
