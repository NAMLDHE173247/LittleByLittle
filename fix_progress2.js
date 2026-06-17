const fs = require('fs');

let content = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');

// Replace res.status(xxx).json({ ... }) with return { status: xxx, json: { ... } }
// Replace res.json({ ... }) with return { status: 200, json: { ... } }

content = content.replace(/res\.status\((.*?)\)\.json\(([\s\S]*?)\);?/g, 'return { status: $1, json: $2 };');
content = content.replace(/res\.json\(([\s\S]*?)\);?/g, 'return { status: 200, json: $1 };');

// Also replace req.query with req.query passed in, req.body with req.body, req.user!.id with userId
content = content.replace(/req\.user!\.id/g, 'userId');
content = content.replace(/req\.user\?\.id/g, 'userId');
content = content.replace(/req\.user/g, '({id: userId})');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', content, 'utf-8');
