const fs = require('fs');
let prog = fs.readFileSync('server/src/routes/progress.ts', 'utf-8');

// Replace standard imports
prog = prog.replace(/import { Router, Response } from "express";\r?\n/, '');
prog = prog.replace(/import UserWordProgress.*?\r?\n/, 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
prog = prog.replace(/import Vocabulary.*?\r?\n/, '');
prog = prog.replace(/import { authenticate.*?\r?\n/, '');
prog = prog.replace(/const router = Router\(\);\r?\n/, '');
prog = prog.replace(/router\.use\(.*?\r?\n/, '');

// Find where helper functions end and routes begin
// The first route is router.get("/stats"
let routesStart = prog.indexOf('router.get("/stats"');
let importsAndHelpers = prog.substring(0, routesStart);
let routesCode = prog.substring(routesStart);

// Convert routes
routesCode = routesCode.replace(/router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{/g, (match, method, path) => {
    let name = path.replace(/\//g, "_").replace(/-/g, "_").replace(/:/g, "by_");
    if (name === "_") name = "index";
    name = name.replace(/^_/, "");
    return `  static async handle_${method.toUpperCase()}_${name}(req: any, res: any, userId: string) {`;
});

routesCode = routesCode.replace(/export default router;/g, '}');
routesCode = routesCode.replace(/(static async handle_[^{]+{)/g, '$1\n    await dbConnect();');

routesCode = routesCode.replace(/res\.status\((.*?)\)\.json\(([\s\S]*?)\);?/g, 'return { status: $1, json: $2 };');
routesCode = routesCode.replace(/res\.json\(([\s\S]*?)\);?/g, 'return { status: 200, json: $1 };');

routesCode = routesCode.replace(/req\.user!\.id/g, 'userId');
routesCode = routesCode.replace(/req\.user\?\.id/g, 'userId');
routesCode = routesCode.replace(/req\.user/g, '({id: userId})');

let finalCode = importsAndHelpers + "\nexport class ProgressService {\n" + routesCode;
fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', finalCode, 'utf-8');
