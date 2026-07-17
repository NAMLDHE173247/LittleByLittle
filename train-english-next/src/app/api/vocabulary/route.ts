import { NextRequest, NextResponse } from "next/server";
import { VocabularyService } from "@/lib/services/vocabulary.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const queryArgs = Object.fromEntries(searchParams.entries());

    const result = await VocabularyService.getPaginated(queryArgs, authUser.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    // Sanitize body: remove fields that should not be set by client
    const { userId, _id, createdAt, updatedAt, normalizedWord, ...safeData } = body;
    
    const result = await VocabularyService.create(safeData, authUser.id);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Từ này đã tồn tại trong kho từ vựng của bạn.") {
      return NextResponse.json({ success: false, message: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const deletedCount = await VocabularyService.deleteMany(body.ids, authUser.id);
    return NextResponse.json({ success: true, message: `Deleted ${deletedCount} items` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
