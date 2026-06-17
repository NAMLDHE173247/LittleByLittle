const fs = require('fs');

let pageContent = fs.readFileSync('train-english-next/src/app/page.tsx', 'utf-8');
pageContent = pageContent.replace(/import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5000'/g, "''");
fs.writeFileSync('train-english-next/src/app/page.tsx', pageContent, 'utf-8');

let authContent = fs.readFileSync('train-english-next/src/AuthContext.tsx', 'utf-8');
authContent = authContent.replace(/import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5000'/g, "''");
fs.writeFileSync('train-english-next/src/AuthContext.tsx', authContent, 'utf-8');
