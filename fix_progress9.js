const fs = require('fs');

let prog = fs.readFileSync('server/src/routes/progress.ts', 'utf-8');

// Replace standard imports
prog = prog.replace(/import { Router, Response } from "express";\r?\n/, '');
prog = prog.replace(/import UserWordProgress.*?\r?\n/, 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
prog = prog.replace(/import Vocabulary.*?\r?\n/, '');
prog = prog.replace(/import { authenticate.*?\r?\n/, '');

// Replace router setup
prog = prog.replace(/const router = Router\(\);\r?\n/, '');
prog = prog.replace(/\/\/ All progress routes require authentication\r?\nrouter\.use\(authenticate as any\);\r?\n/, '');
prog = prog.replace(/export default router;\r?\n/, '');

// Convert routes to exported async functions
prog = prog.replace(/router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{/g, (match, method, path) => {
    let name = path.replace(/\//g, "_").replace(/-/g, "_").replace(/:/g, "by_");
    if (name === "_") name = "index";
    name = name.replace(/^_/, "");
    return `export const handle_${method.toUpperCase()}_${name} = async (req: any, res: any, userId: string) => { \n  await dbConnect();`;
});

// Alias user ID
prog = prog.replace(/req\.user!\.id/g, 'userId');
prog = prog.replace(/req\.user\?\.id/g, 'userId');

// Fix trailing `});` of blocks.
// They always appear right before `\n\n// ===` or at the very end of the file.
prog = prog.replace(/\}\);\r?\n\r?\n\/\/ =/g, '};\n\n// =');
prog = prog.replace(/\}\);\r?\n?$/g, '};');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
