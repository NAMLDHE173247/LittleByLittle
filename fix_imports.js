const fs = require('fs');
let content = fs.readFileSync('train-english-next/src/app/page.tsx', 'utf-8');

// The incorrect replaces turned ./ into ../../
content = content.replace(/from '\.\.\/\.\.\//g, "from '../");

// Also check types import
content = content.replace(/from '\.\.\/types'/g, "from '../types/client'");

// Wait, AuthContext import was probably from './AuthContext' which became '../../AuthContext'. It should be '../AuthContext'
content = content.replace(/from '\.\.\/AuthContext'/g, "from '../AuthContext'");

fs.writeFileSync('train-english-next/src/app/page.tsx', content, 'utf-8');

// I also need to check AuthContext.tsx
let authContent = fs.readFileSync('train-english-next/src/AuthContext.tsx', 'utf-8');
// AuthContext is at src/AuthContext.tsx. It doesn't import from pages or components, it's mostly self-contained.
fs.writeFileSync('train-english-next/src/AuthContext.tsx', authContent, 'utf-8');
