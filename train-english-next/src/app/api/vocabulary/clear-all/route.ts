import { NextRequest, NextResponse } from "next/server";
import { VocabularyService } from "@/lib/services/vocabulary.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function DELETE(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const deletedCount = await VocabularyService.deleteAll(authUser.id);
    return NextResponse.json({ success: true, message: `Đã xóa toàn bộ ${deletedCount} từ vựng`, data: { deletedCount } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
