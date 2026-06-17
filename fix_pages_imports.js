const fs = require('fs');

function replaceInFile(file) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/from '..\/pages\//g, "from '../components/features/");
    content = content.replace(/from '\.\.\/pages\//g, "from '../components/features/");
    content = content.replace(/from '\.\.\/\.\.\/pages\//g, "from '../../components/features/");
    fs.writeFileSync(file, content, 'utf-8');
}

replaceInFile('train-english-next/src/app/page.tsx');
// Also AuthContext
let auth = fs.readFileSync('train-english-next/src/AuthContext.tsx', 'utf-8');
// AuthContext doesn't import pages
