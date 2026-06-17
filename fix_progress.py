import re

with open("train-english-next/src/lib/services/progress.service.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Remove imports
content = re.sub(r'import { Router, Response } from "express";\n', '', content)
content = re.sub(r'import UserWordProgress.*?\n', 'import { UserWordProgress, Vocabulary } from "../db/models";\nimport dbConnect from "../db/connection";\n', content)
content = re.sub(r'import Vocabulary.*\n', '', content)
content = re.sub(r'import { authenticate.*?\n', '', content)
content = re.sub(r'const router = Router\(\);\n', '', content)
content = re.sub(r'router\.use\(.*?\n', '', content)

# Wrap in class
content = "export class ProgressService {\n" + content

# Convert router.get("/stats", async (req: AuthRequest, res: Response) => {
# to static async getStats(userId: string) {
def replace_route(match):
    method = match.group(1).upper()
    path = match.group(2)
    # create a name based on path
    name = path.replace("/", "_").replace("-", "_").replace(":", "by_")
    if name == "_": name = "index"
    name = name.strip("_")
    
    # We will just pass userId and req if needed
    return f"  static async handle_{method}_{name}(req: any, res: any, userId: string) {{"

content = re.sub(r'router\.(get|post|put|patch|delete)\("([^"]+)"(?:,\s*requireAdmin\s*as\s*any)?,\s*async\s*\([^)]*\)\s*=>\s*\{', replace_route, content)

# Remove export default router
content = re.sub(r'export default router;', '}', content)

# Add dbConnect to all methods
content = re.sub(r'(static async handle_[^{]+{)', r'\1\n    await dbConnect();', content)

with open("train-english-next/src/lib/services/progress.service.ts", "w", encoding="utf-8") as f:
    f.write(content)
