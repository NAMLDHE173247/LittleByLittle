const fs = require('fs');
const path = require('path');

function fixAuthImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixAuthImports(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            content = content.replace(/from '\.\.\/AuthContext'/g, "from '@/AuthContext'");
            content = content.replace(/from '\.\.\/\.\.\/AuthContext'/g, "from '@/AuthContext'");
            content = content.replace(/from '\.\.\/\.\.\/\.\.\/AuthContext'/g, "from '@/AuthContext'");
            
            // Also fix import.meta.env
            content = content.replace(/import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5000'/g, "''");
            
            fs.writeFileSync(fullPath, content, 'utf-8');
        }
    }
}

fixAuthImports('train-english-next/src');
