const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src/app/api/progress');

const routes = {
  'stats': { method: 'GET', handler: 'getStats' },
  'due': { method: 'GET', handler: 'getDue', usePayload: true },
  'practice-words': { method: 'GET', handler: 'getPracticeWords', usePayload: true },
  'review': { method: 'POST', handler: 'reviewWord', usePayload: true },
  'apply-decay': { method: 'POST', handler: 'applyDecay' },
  'seed-demo': { method: 'POST', handler: 'seedDemo' },
  'words': { method: 'GET', handler: 'getWords', usePayload: true },
  'adjust': { method: 'PATCH', handler: 'adjustProgress', usePayload: true },
  'clear': { method: 'DELETE', handler: 'clearProgress' },
};

function generateRouteCode(endpoint, config) {
  let payloadLogic = '';
  if (config.usePayload) {
    if (config.method === 'GET') {
      payloadLogic = `
  const { searchParams } = new URL(req.url);
  const payload = Object.fromEntries(searchParams.entries());
`;
    } else {
      payloadLogic = `
  let payload: any = {};
  try { payload = await req.json(); } catch(e) {}
`;
    }
  }

  const callArgs = config.usePayload ? `payload as any, authUser.id` : `authUser.id`;

  return `import { NextRequest, NextResponse } from "next/server";
import { ${config.handler} } from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function ${config.method}(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
${payloadLogic}
    const result = await ${config.handler}(${callArgs});
    return NextResponse.json(result);
  } catch (error: any) {
    try {
      const parsedError = JSON.parse(error.message);
      return NextResponse.json(parsedError, { status: 400 });
    } catch {
      return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
    }
  }
}
`;
}

// Create directories and files
for (const [endpoint, config] of Object.entries(routes)) {
  const dirPath = path.join(baseDir, endpoint);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, 'route.ts'), generateRouteCode(endpoint, config));
}

// Create clear/[wordId]
const clearWordIdDir = path.join(baseDir, 'clear', '[wordId]');
if (!fs.existsSync(clearWordIdDir)) fs.mkdirSync(clearWordIdDir, { recursive: true });
const clearWordIdCode = `import { NextRequest, NextResponse } from "next/server";
import { clearProgressByWordId } from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ wordId: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { wordId } = await params;
    const result = await clearProgressByWordId({ wordId }, authUser.id);
    return NextResponse.json(result);
  } catch (error: any) {
    try {
      const parsedError = JSON.parse(error.message);
      return NextResponse.json(parsedError, { status: 400 });
    } catch {
      return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
    }
  }
}
`;
fs.writeFileSync(path.join(clearWordIdDir, 'route.ts'), clearWordIdCode);

// Remove the old catch-all
const catchAllDir = path.join(baseDir, '[[...path]]');
if (fs.existsSync(catchAllDir)) {
  fs.rmSync(catchAllDir, { recursive: true, force: true });
}

console.log('Routes generated successfully.');
