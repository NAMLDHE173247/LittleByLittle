import { NextRequest, NextResponse } from "next/server";
import { VocabularyService } from "@/lib/services/vocabulary.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    let words = [];
    let deckIds: string[] = [];
    if (Array.isArray(body)) {
      words = body;
    } else {
      if (body.words && Array.isArray(body.words)) words = body.words;
      if (body.deckIds && Array.isArray(body.deckIds)) deckIds = body.deckIds;
    }
    if (!words || words.length === 0) {
      return NextResponse.json({ success: false, message: "Dữ liệu từ vựng không hợp lệ hoặc rỗng" }, { status: 400 });
    }

    const result = await VocabularyService.bulkImport(words, deckIds, authUser.id);
    return NextResponse.json({ success: true, message: `Import thành công`, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
