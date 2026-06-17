const fs = require('fs');

// 1. Add "use client" to AuthContext.tsx
const authPath = 'train-english-next/src/AuthContext.tsx';
let authContent = fs.readFileSync(authPath, 'utf8');
if (!authContent.includes('"use client"')) {
    authContent = '"use client";\n' + authContent;
    fs.writeFileSync(authPath, authContent, 'utf8');
}

// 2. Fix emptyForm import in GlobalDataProvider.tsx
const globalDataPath = 'train-english-next/src/components/providers/GlobalDataProvider.tsx';
let globalDataContent = fs.readFileSync(globalDataPath, 'utf8');
globalDataContent = globalDataContent.replace("import { emptyForm } from '@/types';", `
export const emptyForm = {
  word: '',
  type: 'word',
  pronunciation: '',
  meanings: '',
  partOfSpeech: '',
  examples: [{ en: '', vi: '' }],
  topic: '',
  level: '',
  synonyms: '',
  antonyms: '',
  note: '',
  imageUrl: '',
  deckIds: [],
};
`);
fs.writeFileSync(globalDataPath, globalDataContent, 'utf8');
