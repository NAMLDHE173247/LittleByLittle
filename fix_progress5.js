const fs = require('fs');

let prog = fs.readFileSync('server/src/routes/progress.ts', 'utf-8');

// Replace imports
prog = prog.replace(/import { Router, Response } from "express";\r?\n/, '');
prog = prog.replace(/import UserWordProgress.*?\r?\n/, 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
prog = prog.replace(/import Vocabulary.*?\r?\n/, '');
prog = prog.replace(/import { authenticate.*?\r?\n/, '');

// Replace router setup
prog = prog.replace(/const router = Router\(\);\r?\n/, '');
prog = prog.replace(/router\.use\(.*?\r?\n/, '');
prog = prog.replace(/export default router;/g, '');

// Convert routes to exported async functions
prog = prog.replace(/router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{/g, (match, method, path) => {
    let name = path.replace(/\//g, "_").replace(/-/g, "_").replace(/:/g, "by_");
    if (name === "_") name = "index";
    name = name.replace(/^_/, "");
    return `export const handle_${method.toUpperCase()}_${name} = async (req: any, res: any, userId: string) => { \n  await dbConnect();`;
});

// Alias user id
prog = prog.replace(/req\.user!\.id/g, 'userId');
prog = prog.replace(/req\.user\?\.id/g, 'userId');
prog = prog.replace(/req\.user/g, '({id: userId})');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
