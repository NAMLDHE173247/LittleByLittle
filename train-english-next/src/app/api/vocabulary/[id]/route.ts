import { NextRequest, NextResponse } from "next/server";
import { VocabularyService } from "@/lib/services/vocabulary.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { userId, _id, createdAt, updatedAt, normalizedWord, ...safeData } = body;

    const result = await VocabularyService.update(id, safeData, authUser.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === "Từ này đã tồn tại trong kho từ vựng của bạn.") {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await VocabularyService.deleteOne(id, authUser.id);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
