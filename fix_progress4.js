const fs = require('fs');

// 1. Read the original progress.ts
let prog = fs.readFileSync('server/src/routes/progress.ts', 'utf-8');

// 2. Remove express imports and router setup
prog = prog.replace(/import { Router, Response } from "express";\r?\n/, '');
prog = prog.replace(/import UserWordProgress.*?\r?\n/, 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
prog = prog.replace(/import Vocabulary.*?\r?\n/, '');
prog = prog.replace(/import { authenticate.*?\r?\n/, '');
prog = prog.replace(/const router = Router\(\);\r?\n/, '');
prog = prog.replace(/router\.use\(.*?\r?\n/, '');

// 3. Move imports to top, put everything else in ProgressService class
let importLines = [];
let codeLines = [];
for (let line of prog.split('\n')) {
  if (line.startsWith('import ') && !line.includes('{')) {
    importLines.push(line);
  } else if (line.startsWith('import {') || line.startsWith('} from')) {
    importLines.push(line);
  } else if (line.includes('applyDecayToProgress') || line.includes('calculateAnswerPoints') || line.includes('getNextReviewDate')) {
    importLines.push(line);
  } else {
    codeLines.push(line);
  }
}

let codeStr = codeLines.join('\n');

// 4. Transform router.get(...) to static async methods
codeStr = codeStr.replace(/router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{/g, (match, method, path) => {
    let name = path.replace(/\//g, "_").replace(/-/g, "_").replace(/:/g, "by_");
    if (name === "_") name = "index";
    name = name.replace(/^_/, "");
    return `  static async handle_${method.toUpperCase()}_${name}(req: any, res: any, userId: string) {`;
});

codeStr = codeStr.replace(/export default router;/g, '}');

// Inject dbConnect and alias req.user.id to userId
codeStr = codeStr.replace(/(static async handle_[^{]+{)/g, '$1\n    await dbConnect();\n    const user = { id: userId };\n    req.user = user;');

// Reassemble
let finalCode = importLines.join('\n') + '\n\nexport class ProgressService {\n' + codeStr;

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', finalCode, 'utf-8');
