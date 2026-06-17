const fs = require('fs');
const authPath = 'train-english-next/src/AuthContext.tsx';
let authContent = fs.readFileSync(authPath, 'utf8');
authContent = authContent.replace(
  `useState<string | null>(() => localStorage.getItem('lbl_token'))`,
  `useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('lbl_token') : null)`
);
fs.writeFileSync(authPath, authContent, 'utf8');
