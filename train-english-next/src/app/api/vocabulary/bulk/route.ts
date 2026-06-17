import { NextRequest, NextResponse } from "next/server";
import { VocabularyService } from "@/lib/services/vocabulary.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser || authUser.role !== "admin") return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    const body = await req.json();
    let words = [];
    if (Array.isArray(body)) words = body;
    else if (body.words && Array.isArray(body.words)) words = body.words;
    else return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ" }, { status: 400 });

    const result = await VocabularyService.bulkImport(words);
    return NextResponse.json({ success: true, message: `Import thành công ${result.inserted} từ vựng`, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
