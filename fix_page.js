const fs = require('fs');
let content = fs.readFileSync('train-english-next/src/app/page.tsx', 'utf-8');

if (!content.startsWith('"use client";')) {
  content = '"use client";\n' + content;
}

// Replace the end or add export default AppWrapper
if (!content.includes('export default AppWrapper')) {
  content += '\nexport default AppWrapper;\n';
}

// Also fix imports like import { VocabularyItem } from '../../types' to '../types/client'
// Or since the file was in client/src and is now in train-english-next/src/app
// it should import from '../pages/...'
content = content.replace(/from '\.\//g, "from '../");
content = content.replace(/from '\.\.\//g, "from '../../");

fs.writeFileSync('train-english-next/src/app/page.tsx', content, 'utf-8');
