import { NextRequest, NextResponse } from "next/server";
import { reviewWord } from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  let payload: any = {};
  try { payload = await req.json(); } catch(e) {}

    const result = await reviewWord(payload as any, authUser.id);
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
