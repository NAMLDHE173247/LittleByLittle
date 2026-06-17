import { NextRequest, NextResponse } from "next/server";
import { clearProgress } from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const result = await clearProgress(authUser.id);
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
