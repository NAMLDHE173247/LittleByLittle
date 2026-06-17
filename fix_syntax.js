const fs = require('fs');

// Fix progress.service.ts
let prog = fs.readFileSync('train-english-next/src/lib/services/progress.service.ts', 'utf-8');
prog = prog.replace(/import { Router, Response } from "express";\r?\n/g, '');
prog = prog.replace(/import UserWordProgress.*?\r?\n/g, '');
prog = prog.replace(/import Vocabulary.*?\r?\n/g, '');
prog = prog.replace(/import { authenticate.*?\r?\n/g, '');
prog = prog.replace(/const router = Router\(\);\r?\n/g, '');
prog = prog.replace(/router\.use\(.*?\r?\n/g, '');
// Move imports outside the class
let imports = 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n';
prog = prog.replace('export class ProgressService {\n', imports + 'export class ProgressService {\n');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');

// Fix page.tsx
let page = fs.readFileSync('train-english-next/src/app/page.tsx', 'utf-8');
page = page.replace(/export default App;\r?\n?/g, '');
fs.writeFileSync('train-english-next/src/app/page.tsx', page, 'utf-8');
