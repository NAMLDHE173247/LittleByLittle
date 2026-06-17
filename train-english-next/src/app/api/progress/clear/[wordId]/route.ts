import { NextRequest, NextResponse } from "next/server";
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
