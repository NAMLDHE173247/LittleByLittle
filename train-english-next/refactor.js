const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/services/progress.service.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace signatures
content = content.replace(/export const handle_GET_stats = async \(req: any, res: any, userId: string\) => \{/g, 'export const getStats = async (userId: string) => {');
content = content.replace(/export const handle_GET_due = async \(req: any, res: any, userId: string\) => \{/g, 'export const getDue = async (payload: { skill?: string; limit?: number }, userId: string) => {');
content = content.replace(/export const handle_GET_practice_words = async \(req: any, res: any, userId: string\) => \{/g, 'export const getPracticeWords = async (payload: { count?: number; mode?: string; tier?: string; deckId?: string }, userId: string) => {');
content = content.replace(/export const handle_POST_review = async \(req: any, res: any, userId: string\) => \{/g, 'export const reviewWord = async (payload: { wordId: string; skill: string; correct: boolean }, userId: string) => {');
content = content.replace(/export const handle_POST_apply_decay = async \(req: any, res: any, userId: string\) => \{/g, 'export const applyDecay = async (userId: string) => {');
content = content.replace(/export const handle_POST_seed_demo = async \(req: any, res: any, userId: string\) => \{/g, 'export const seedDemo = async (userId: string) => {');
content = content.replace(/export const handle_GET_words = async \(req: any, res: any, userId: string\) => \{/g, 'export const getWords = async (payload: { tier?: string; search?: string; sort?: string; page?: string; limit?: string; skill?: string }, userId: string) => {');
content = content.replace(/export const handle_PATCH_adjust = async \(req: any, res: any, userId: string\) => \{/g, 'export const adjustProgress = async (payload: { wordId: string; skill: string; amount: number }, userId: string) => {');
content = content.replace(/export const handle_DELETE_clear = async \(req: any, res: any, userId: string\) => \{/g, 'export const clearProgress = async (userId: string) => {');
content = content.replace(/export const handle_DELETE_clear_by_wordId = async \(req: any, res: any, userId: string\) => \{/g, 'export const clearProgressByWordId = async (payload: { wordId: string }, userId: string) => {');

// 2. Replace req.query, req.body, req.params with payload
content = content.replace(/req\.query\.skill/g, 'payload.skill');
content = content.replace(/req\.query\.limit/g, 'payload.limit');
content = content.replace(/req\.query\.count/g, 'payload.count');
content = content.replace(/req\.query\.mode/g, 'payload.mode');
content = content.replace(/req\.query\.tier/g, 'payload.tier');
content = content.replace(/req\.query\.deckId/g, 'payload.deckId');
content = content.replace(/const \{ wordId, skill, correct \} = req\.body;/g, 'const { wordId, skill, correct } = payload;');
content = content.replace(/const \{ wordId, skill, amount \} = req\.body;/g, 'const { wordId, skill, amount } = payload;');
content = content.replace(/const \{ wordId \} = req\.params;/g, 'const { wordId } = payload;');
content = content.replace(/req\.query as Record<string, string>/g, 'payload as Record<string, string>');

// 3. Replace res.status(xxx).json(...) with throw Error or return {...}
content = content.replace(/res\.status\(400\)\.json\(\{([\s\S]*?)\}\);[\s]*return;/g, 'throw new Error(JSON.stringify({$1}));');
content = content.replace(/res\s*\.status\(500\)\s*\.json\(\{ success: false, message: "Server error", error \}\);/g, 'throw error;');
content = content.replace(/res\.status\(500\)\.json\(\{ success: false, message: "Server error", error \}\);/g, 'throw error;');

// 4. Replace res.json(...) with return ...
content = content.replace(/res\.json\(\{/g, 'return {');
// The closing brace for return { ... } is just } instead of }); since res.json({ ... }) closes with });
// This is a bit tricky with regex, we can match return { ... }); and replace it with return { ... };
// Wait, res.json({ success: true, data: ... });
// Let's replace res.json with return, and we'll fix the closing manually or with regex.
// A simpler way:
// Since it's exactly res.json({, we can replace it with return {.
// But then the end is });. We can replace }); with }; globally, but that might break other code.
// Let's do a more targeted replace.
content = content.replace(/res\.json\(\{\n/g, 'return {\n');

// Find all `return {\n` and their matching `});` and replace with `};`
// Since it's mostly at the end of try block:
content = content.replace(/\s*\}\);\n\s*\} catch/g, '};\n  } catch');

// Save the modified file
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactor completed.');
