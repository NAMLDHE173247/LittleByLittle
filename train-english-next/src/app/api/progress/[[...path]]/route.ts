import { NextRequest, NextResponse } from "next/server";
import * as ProgressService from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

class MockResponse {
  statusCode: number = 200;
  responseData: any = null;
  resolve: any;

  constructor(resolve: any) {
    this.resolve = resolve;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.responseData = data;
    this.resolve({ status: this.statusCode, json: data });
  }

  send(data: any) {
    this.responseData = data;
    this.resolve({ status: this.statusCode, json: data });
  }
}

async function handleProgress(req: NextRequest, paths: string[], authUser: any) {
  return new Promise(async (resolve) => {
    try {
      const res = new MockResponse(resolve);
      const method = req.method.toUpperCase();
      const pathJoined = paths.join('_').replace(/-/g, '_');
      let handlerName = `handle_${method}_${pathJoined}`;

      // Handle dynamic route for /clear/:wordId
      if (paths[0] === 'clear' && paths.length === 2 && method === 'DELETE') {
        handlerName = 'handle_DELETE_clear_by_wordId';
      }

      const { searchParams } = new URL(req.url);
      const queryArgs = Object.fromEntries(searchParams.entries());
      let body = {};
      try { body = await req.json(); } catch(e) {}

      const mockReq = {
        query: queryArgs,
        body: body,
        params: { wordId: paths[1] }, // Handle /clear/:wordId
      };

      if ((ProgressService as any)[handlerName]) {
        await (ProgressService as any)[handlerName](mockReq, res, authUser.id);
      } else {
        resolve({ status: 404, json: { success: false, message: "Not found" } });
      }
    } catch (e: any) {
      resolve({ status: 500, json: { success: false, message: e.message } });
    }
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const authUser = verifyAuth(req);
  if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const p = await params;
  const result: any = await handleProgress(req, p.path || [], authUser);
  return NextResponse.json(result.json, { status: result.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const authUser = verifyAuth(req);
  if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const p = await params;
  const result: any = await handleProgress(req, p.path || [], authUser);
  return NextResponse.json(result.json, { status: result.status });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const authUser = verifyAuth(req);
  if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const p = await params;
  const result: any = await handleProgress(req, p.path || [], authUser);
  return NextResponse.json(result.json, { status: result.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const authUser = verifyAuth(req);
  if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const p = await params;
  const result: any = await handleProgress(req, p.path || [], authUser);
  return NextResponse.json(result.json, { status: result.status });
}
