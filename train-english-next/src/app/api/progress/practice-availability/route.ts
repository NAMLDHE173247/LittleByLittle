import { NextRequest, NextResponse } from "next/server";
import { getPracticeAvailability } from "@/lib/services/progress.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const deckId = searchParams.get("deckId") || undefined;

    const result = await getPracticeAvailability({ deckId }, authUser.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
