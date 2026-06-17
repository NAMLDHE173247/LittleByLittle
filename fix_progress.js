const fs = require('fs');

let content = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');

content = content.replace(/import { Router, Response } from "express";\n/g, '');
content = content.replace(/import UserWordProgress.*?\n/g, 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
content = content.replace(/import Vocabulary.*\n/g, '');
content = content.replace(/import { authenticate.*?\n/g, '');
content = content.replace(/const router = Router\(\);\n/g, '');
content = content.replace(/router\.use\(.*?\n/g, '');

content = "export class ProgressService {\n" + content;

content = content.replace(/router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{/g, (match, method, path) => {
    let name = path.replace(/\//g, "_").replace(/-/g, "_").replace(/:/g, "by_");
    if (name === "_") name = "index";
    name = name.replace(/^_/, "");
    
    return `  static async handle_${method.toUpperCase()}_${name}(req: any, res: any, userId: string) {`;
});

content = content.replace(/export default router;/g, '}');

content = content.replace(/(static async handle_[^{]+{)/g, '$1\n    await dbConnect();');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', content, 'utf-8');
