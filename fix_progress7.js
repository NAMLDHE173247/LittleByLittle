const fs = require('fs');

let prog = fs.readFileSync('server/src/routes/progress.ts', 'utf-8');

// Replace standard imports
prog = prog.replace('import { Router, Response } from "express";\n', '');
prog = prog.replace('import UserWordProgress from "../models/UserWordProgress";\n', 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n');
prog = prog.replace('import Vocabulary from "../models/Vocabulary";\n', '');
prog = prog.replace('import { authenticate, requireAdmin, AuthRequest } from "../middleware/auth";\n', '');

// Replace router setup
prog = prog.replace('const router = Router();\n', '');
prog = prog.replace('// All progress routes require authentication\nrouter.use(authenticate as any);\n', '');
prog = prog.replace('export default router;\n', '');

// Convert routes to exported async functions
prog = prog.replace('router.get("/stats", async (req: AuthRequest, res: Response) => {', 'export const handle_GET_stats = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.get("/due", async (req: AuthRequest, res: Response) => {', 'export const handle_GET_due = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.get("/practice-words", async (req: AuthRequest, res: Response) => {', 'export const handle_GET_practice_words = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.post("/review", async (req: AuthRequest, res: Response) => {', 'export const handle_POST_review = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.post("/apply-decay", async (req: AuthRequest, res: Response) => {', 'export const handle_POST_apply_decay = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.post("/seed-demo", requireAdmin as any, async (req: AuthRequest, res: Response) => {', 'export const handle_POST_seed_demo = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.get("/words", async (req: AuthRequest, res: Response) => {', 'export const handle_GET_words = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.patch("/adjust", async (req: AuthRequest, res: Response) => {', 'export const handle_PATCH_adjust = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.delete("/clear", async (req: AuthRequest, res: Response) => {', 'export const handle_DELETE_clear = async (req: any, res: any, userId: string) => {\n  await dbConnect();');
prog = prog.replace('router.delete("/clear/:wordId", async (req: AuthRequest, res: Response) => {', 'export const handle_DELETE_clear_by_wordId = async (req: any, res: any, userId: string) => {\n  await dbConnect();');

// Also alias user ID
prog = prog.replace(/req\.user!\.id/g, 'userId');
prog = prog.replace(/req\.user\?\.id/g, 'userId');

fs.writeFileSync('train-english-next/src/lib/services/progress.service.ts', prog, 'utf-8');
